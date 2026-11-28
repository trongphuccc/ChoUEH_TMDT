const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail, mailConfigured, isLive } = require('../utils/mailer');

const UEH_EMAIL_REGEX = /(@student\.ueh\.edu\.vn|@ueh\.edu\.vn)$/i;
const UEH_STUDENT_ID_REGEX = /^31\d{9}$/;

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
});

const sendAuthResponse = (res, statusCode, token, user, message) => {
  res
    .cookie('token', token, getCookieOptions())
    .status(statusCode)
    .json({
      success: true,
      message,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
        role: user.role
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, studentId, phone, department, year, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedStudentId = studentId?.trim();

    if (!name || !email || !studentId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
      });
    }

    if (!UEH_EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email phải là email UEH (@student.ueh.edu.vn)'
      });
    }

    if (!UEH_STUDENT_ID_REGEX.test(normalizedStudentId)) {
      return res.status(400).json({
        success: false,
        message: 'MSSV không hợp lệ'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { studentId: normalizedStudentId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc MSSV đã được sử dụng'
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      studentId: normalizedStudentId,
      phone,
      department: department || 'Khoa Kinh tế',
      year: year || 'Khóa 49',
      password
    });

    const token = generateToken(user._id);
    sendAuthResponse(res, 201, token, user, 'Đăng ký thành công!');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc MSSV đã tồn tại trong hệ thống'
      });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Dữ liệu không hợp lệ'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const credential = email?.trim().toLowerCase();

    if (!credential || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email/MSSV và mật khẩu'
      });
    }

    const user = await User.findOne({
      $or: [{ email: credential }, { studentId: credential }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/MSSV hoặc mật khẩu không đúng'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email/MSSV hoặc mật khẩu không đúng'
      });
    }

    const token = generateToken(user._id);
    sendAuthResponse(res, 200, token, user, 'Đăng nhập thành công!');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user (clear cookie)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res
    .clearCookie('token', getCookieOptions())
    .json({
      success: true,
      message: 'Đăng xuất thành công'
    });
};

const RESET_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
// Never build the emailed link from the request's Host header: anyone can forge it.
const appUrl = () => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

// @desc    Email a one-time password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  // Same answer whether or not the account exists, so the form cannot be used to look up students.
  const generic = {
    success: true,
    message: 'Nếu tài khoản tồn tại, Chợ UEH đã gửi link đặt lại mật khẩu tới email UEH của bạn. Link có hiệu lực trong 30 phút.'
  };
  try {
    const credential = String(req.body.email || '').trim().toLowerCase();
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email UEH hoặc MSSV' });
    }
    if (isLive() && !mailConfigured()) {
      return res.status(503).json({ success: false, message: 'Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.' });
    }

    const user = await User.findOne({ $or: [{ email: credential }, { studentId: credential }] })
      .select('+passwordResetExpires');
    if (!user) return res.json(generic);

    // One email per minute per account.
    if (user.passwordResetExpires && user.passwordResetExpires.getTime() - RESET_TTL_MS > Date.now() - 60 * 1000) {
      return res.json(generic);
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const link = `${appUrl()}/reset-password?token=${token}`;
    const safeName = String(user.name).replace(/[<>&"]/g, '');
    try {
      await sendMail({
        to: user.email,
        subject: 'Đặt lại mật khẩu Chợ UEH',
        text: `Chào ${user.name},\n\nBạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu Chợ UEH.\nMở link sau trong 30 phút để đặt mật khẩu mới:\n${link}\n\nNếu không phải bạn, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.\n\nChợ UEH`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#10282b">
  <h2 style="color:#005f69;margin:0 0 12px">Đặt lại mật khẩu Chợ UEH</h2>
  <p>Chào ${safeName},</p>
  <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu. Bấm nút dưới đây trong <strong>30 phút</strong> để đặt mật khẩu mới.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#c4511a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Đặt mật khẩu mới</a></p>
  <p style="font-size:13px;color:#4a6164">Nếu không phải bạn, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.</p>
</div>`
      });
    } catch (mailError) {
      console.error('Password reset mail failed:', mailError.message);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(502).json({ success: false, message: 'Không gửi được email lúc này, vui lòng thử lại sau ít phút.' });
    }

    res.json(generic);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Set a new password with the emailed token, then sign in
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Link đặt lại mật khẩu không hợp lệ' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(res, 200, generateToken(user._id), user, 'Đã đặt mật khẩu mới');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};
