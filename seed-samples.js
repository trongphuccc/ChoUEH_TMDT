// Adds a set of sample listings (25 for sale + 6 "Đang cần") so the marketplace does not look empty.
// They are posted under the demo accounts from the README. Each description ends with a line saying it
// is a sample, plus the photo credit (photos: Wikimedia Commons, see public/images/samples).
//
//   node seed-samples.js                    -> dry run: shows what would be added
//   node seed-samples.js --apply            -> adds the listings (skips ones already there)
//   node seed-samples.js --remove           -> dry run: shows which sample listings would be deleted
//   node seed-samples.js --remove --apply   -> deletes every sample listing
//
// Demo accounts that do not exist yet are created with a random password nobody knows,
// so they can only act as sellers; nobody can sign in to them.
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Product = require('./models/Product');

const MARK = 'Tin mẫu do nhóm phát triển Chợ UEH tạo để minh hoạ.';
const A = 'Cơ sở A - 59 Nguyễn Đình Chiểu';
const B = 'Cơ sở B - 279 Nguyễn Tri Phương';
const N = 'Cơ sở N - Nguyễn Văn Linh';
const LIB = 'Thư viện';
const CAN = 'Căn tin';
const T2 = 'Sau tiết 2';
const T4 = 'Sau tiết 4';
const NOON = 'Buổi trưa 11h-13h';
const PM = 'Buổi chiều 15h-17h';

const SELLERS = {
  bao: { name: 'Trần Thị Bảo', email: 'bao.tran@student.ueh.edu.vn', studentId: '31211020002', department: 'Khoa Kinh tế', year: 'Khóa 48' },
  chau: { name: 'Lê Minh Châu', email: 'chau.le@student.ueh.edu.vn', studentId: '31211020003', department: 'Khoa Tài chính', year: 'Khóa 49' },
  duy: { name: 'Phạm Hoàng Duy', email: 'duy.pham@student.ueh.edu.vn', studentId: '31211020004', department: 'Khoa Quản trị kinh doanh', year: 'Khóa 48' },
  ha: { name: 'Võ Thanh Hà', email: 'ha.vo@student.ueh.edu.vn', studentId: '31211020005', department: 'Khoa Kế toán', year: 'Khóa 49' }
};

// Photo credits (all from Wikimedia Commons). Required by the CC BY / CC BY-SA licences.
const PHOTO = {
  'textbook-stack': 'Inayaysad, CC BY-SA 4.0',
  'textbook-pile': 'Tiffany Bailey, CC BY 2.0',
  'books-shelf': 'Algeyav, CC BY-SA 4.0',
  'casio-580': 'David Wheatley, CC0',
  'casio-570es': 'DerComputerChecker, CC BY-SA 3.0',
  thinkpad: 'NickW1129, CC0',
  'dell-latitude': 'PolarisLakewell, CC BY-SA 4.0',
  'macbook-air': 'Tim Malabuyo, CC BY 2.0',
  'headphones-sony': 'Wutthichai Charoenburi, CC BY 2.0',
  'earphones-sport': 'Jacek Halicki, CC BY-SA 4.0',
  'keyboard-retro': 'Anirban Saha, CC BY-SA 4.0',
  'monitor-asus': 'MKFI, Public domain',
  'keyboard-mouse': 'Andreas Schwarzkopf, CC BY-SA 4.0',
  'desk-lamp': 'Raimond Spekking, CC BY-SA 4.0',
  'desk-fan': 'DiwangPingkian, CC BY-SA 3.0',
  'hand-fan': 'Curpharar, CC BY-SA 4.0',
  'rice-cooker': 'Dinkun Chen, CC BY-SA 4.0',
  kettle: 'Jacek Halicki, CC BY-SA 4.0',
  'mini-fridge': 'BrittanyJ, CC BY-SA 3.0',
  'water-bottle': 'Based5290, CC BY 4.0',
  bicycle: 'Andrej Shadura, CC BY 4.0',
  'bike-helmet': 'Afifa Afrin, CC BY-SA 4.0',
  sneakers: 'Mizael Contreras, CC BY-SA 4.0',
  'polo-shirt': 'Quercus acuta, CC BY-SA 4.0',
  backpack: 'Wide Awake!, CC BY 4.0'
};

// [seller, photo, fields]
const SELL = [
  ['bao', 'textbook-stack', { title: 'Giáo trình Kinh tế vi mô kèm vở ghi chép', category: 'sach', price: 45000, courseCode: 'KTVM', courseName: 'Kinh tế vi mô', faculty: 'Kinh tế', suitableForYear: [1], semester: 1, academicYear: '2025-2026', meetingPoints: [A, LIB], preferredTimeSlots: [T2, NOON], transactionStatus: 'negotiating',
    description: 'Giáo trình Kinh tế vi mô bản mới, mình học xong học kỳ 1. Có highlight vài chương, kèm vở ghi chép đầy đủ bài tập trên lớp và đề ôn giữa kỳ. Hợp cho bạn năm nhất.' }],
  ['chau', 'textbook-pile', { title: 'Combo 4 giáo trình năm nhất: Triết, KTCT, Toán cao cấp, Kinh tế vĩ mô', category: 'sach', price: 120000, faculty: 'Tài chính', suitableForYear: [1], meetingPoints: [B], preferredTimeSlots: [T4, PM],
    description: 'Pass trọn bộ 4 cuốn giáo trình đại cương năm nhất. Sách còn mới khoảng 85%, không rách trang. Lấy cả combo giá 120k, lấy lẻ 35k/cuốn.' }],
  ['ha', 'books-shelf', { title: 'Sách tham khảo Marketing và Kế toán, bản tiếng Anh', category: 'sach', price: 80000, faculty: 'Kế toán', suitableForYear: [2, 3], meetingPoints: [LIB], preferredTimeSlots: [NOON],
    description: 'Dọn kệ sách nên pass lại mấy cuốn tham khảo tiếng Anh: Principles of Marketing, Financial Accounting và một cuốn từ điển chuyên ngành. Sách cũ nhưng chữ rõ, đọc tốt.' }],
  ['duy', 'casio-580', { title: 'Máy tính Casio fx-580VN X, còn bảo hành', category: 'dien-tu', price: 380000, condition: 'used', meetingPoints: [A, CAN], preferredTimeSlots: [T2, T4],
    description: 'Casio fx-580VN X mua đầu năm, dùng một học kỳ. Còn tem chính hãng, nắp và hộp đầy đủ, màn hình không trầy. Mang vào phòng thi được.' }],
  ['bao', 'casio-570es', { title: 'Casio fx-570ES Plus, đủ nắp, pin còn tốt', category: 'dien-tu', price: 150000, meetingPoints: [A], preferredTimeSlots: [NOON],
    description: 'Máy cũ mình dùng từ cấp 3, bấm vẫn nhạy, pin năng lượng mặt trời còn tốt. Phù hợp cho môn Toán cao cấp và Thống kê.' }],
  ['duy', 'thinkpad', { title: 'Lenovo ThinkPad T14 Core i5, RAM 16GB, SSD 512GB', category: 'dien-tu', price: 6900000, meetingPoints: [N, LIB], preferredTimeSlots: [PM],
    description: 'ThinkPad T14 i5 thế hệ 10, RAM 16GB, SSD 512GB, màn 14 inch Full HD. Bàn phím gõ êm, pin còn khoảng 4 tiếng. Chạy Excel, SPSS, Power BI mượt. Có sạc zin, cho test máy thoải mái.' }],
  ['chau', 'dell-latitude', { title: 'Dell Latitude E7440 i5, 8GB, SSD 256GB', category: 'dien-tu', price: 4200000, meetingPoints: [B], preferredTimeSlots: [T4], transactionStatus: 'negotiating',
    description: 'Máy văn phòng bền, vỏ kim loại, màn 14 inch. Đã thay SSD 256GB và pin mới cách đây 3 tháng. Phù hợp học online, làm Word/Excel, thuyết trình.' }],
  ['ha', 'macbook-air', { title: 'MacBook Air 13 inch 2017, pin 86%', category: 'dien-tu', price: 6500000, meetingPoints: [A, LIB], preferredTimeSlots: [NOON, PM],
    description: 'MacBook Air 2017 i5, RAM 8GB, SSD 128GB. Pin còn 86%, máy đẹp không móp. Cài sẵn Office, kèm túi chống sốc.' }],
  ['bao', 'headphones-sony', { title: 'Tai nghe Sony chụp tai màu trắng', category: 'dien-tu', price: 350000, meetingPoints: [A], preferredTimeSlots: [T2],
    description: 'Tai nghe chụp tai có dây, âm bass ổn, đệm tai còn mềm. Dùng học IELTS listening rất hợp. Đổi sang tai nghe không dây nên pass.' }],
  ['duy', 'earphones-sport', { title: 'Tai nghe bluetooth thể thao, pin 8 tiếng', category: 'dien-tu', price: 180000, meetingPoints: [N], preferredTimeSlots: [PM],
    description: 'Tai nghe bluetooth đeo cổ, nghe nhạc khoảng 8 tiếng, có mic gọi điện. Còn hộp và cáp sạc.' }],
  ['chau', 'keyboard-retro', { title: 'Bàn phím cơ keycap tròn phong cách retro', category: 'dien-tu', price: 550000, meetingPoints: [B, CAN], preferredTimeSlots: [NOON],
    description: 'Bàn phím cơ 84 phím, switch xanh gõ có tiếng click, đèn nền nhiều chế độ. Keycap tròn màu hồng trắng. Dùng 6 tháng, không liệt phím.' }],
  ['duy', 'monitor-asus', { title: 'Màn hình ASUS 24 inch Full HD', category: 'dien-tu', price: 1500000, meetingPoints: [N], preferredTimeSlots: [PM],
    description: 'Màn 24 inch Full HD, chân đế xoay được. Không điểm chết, kèm cáp HDMI. Thêm màn phụ học online và làm bài nhóm rất tiện. Ưu tiên giao ở Cơ sở N.' }],
  ['ha', 'keyboard-mouse', { title: 'Combo bàn phím và chuột không dây', category: 'dien-tu', price: 200000, meetingPoints: [A], preferredTimeSlots: [T4],
    description: 'Bộ phím chuột không dây dùng chung một đầu USB, pin AA dùng lâu. Gõ êm, phù hợp gắn laptop làm bàn học ở phòng trọ.' }],
  ['bao', 'desk-lamp', { title: 'Đèn bàn LED cảm ứng, sạc USB', category: 'do-dung', price: 120000, meetingPoints: [A, CAN], preferredTimeSlots: [NOON],
    description: 'Đèn bàn LED 3 mức sáng, chạm để bật, sạc USB dùng khoảng 5 tiếng. Ánh sáng dịu, không chói mắt khi học khuya.' }],
  ['chau', 'desk-fan', { title: 'Quạt đứng mini để bàn', category: 'do-dung', price: 150000, meetingPoints: [B], preferredTimeSlots: [T2, T4],
    description: 'Quạt bàn 3 tốc độ, xoay được, chạy êm. Hợp phòng ký túc xá hoặc phòng trọ nhỏ. Mình chuyển nhà nên thanh lý.' }],
  ['ha', 'hand-fan', { title: 'Quạt cầm tay sạc USB', category: 'do-dung', price: 60000, condition: 'new', meetingPoints: [LIB], preferredTimeSlots: [NOON],
    description: 'Quạt cầm tay mini, sạc USB, có chân đứng để bàn. Mua dư một cái, chưa dùng.' }],
  ['duy', 'rice-cooker', { title: 'Nồi cơm điện mini 1 lít', category: 'do-dung', price: 250000, meetingPoints: [N, CAN], preferredTimeSlots: [PM],
    description: 'Nồi cơm điện tử 1 lít, nấu đủ 2 người ăn, có chế độ nấu cháo và hâm nóng. Lòng nồi chống dính còn tốt.' }],
  ['bao', 'kettle', { title: 'Ấm siêu tốc 1.7 lít', category: 'do-dung', price: 120000, meetingPoints: [A], preferredTimeSlots: [T2],
    description: 'Ấm đun nước siêu tốc 1.7 lít, tự ngắt khi sôi. Dùng pha mì, pha cà phê ở ký túc xá tiện lắm.' }],
  ['chau', 'mini-fridge', { title: 'Tủ lạnh mini 50 lít cho phòng trọ', category: 'do-dung', price: 1200000, meetingPoints: [B], preferredTimeSlots: [PM], transactionStatus: 'negotiating',
    description: 'Tủ lạnh mini 50 lít, làm lạnh tốt, có ngăn đá nhỏ. Chạy êm, tiết kiệm điện. Mình ra trường nên pass, bạn tự chở về giúp mình nhé.' }],
  ['ha', 'water-bottle', { title: 'Bình giữ nhiệt 500ml', category: 'do-dung', price: 90000, meetingPoints: [LIB, CAN], preferredTimeSlots: [NOON],
    description: 'Bình giữ nhiệt inox 500ml, giữ lạnh khoảng 12 tiếng, nắp bật một tay. Không móp, không rỉ nước.' }],
  ['duy', 'bicycle', { title: 'Xe đạp mini có giỏ, phù hợp đi Cơ sở N', category: 'xe', price: 900000, meetingPoints: [N], preferredTimeSlots: [PM],
    description: 'Xe đạp mini khung sơn đỏ, có giỏ trước và baga sau. Phanh, xích vừa bảo dưỡng. Đạp từ ký túc xá sang Cơ sở N rất tiện.' }],
  ['bao', 'bike-helmet', { title: 'Mũ bảo hiểm xe đạp size M', category: 'xe', price: 120000, meetingPoints: [A], preferredTimeSlots: [T4],
    description: 'Mũ bảo hiểm xe đạp nhẹ, có lỗ thoáng khí, khoá cằm chỉnh được. Đội vừa vòng đầu 54 đến 58 cm.' }],
  ['chau', 'sneakers', { title: 'Giày sneaker trắng size 41', category: 'thoi-trang', price: 280000, meetingPoints: [B], preferredTimeSlots: [NOON],
    description: 'Giày canvas trắng size 41, mang khoảng 5 lần, đã giặt sạch. Mua lỡ size nên pass lại.' }],
  ['ha', 'polo-shirt', { title: 'Áo polo xanh nhạt size M', category: 'thoi-trang', price: 70000, meetingPoints: [A, CAN], preferredTimeSlots: [T2],
    description: 'Áo polo cotton màu xanh nhạt, size M, mặc đi học hoặc thuyết trình đều được. Không xù lông, không phai màu.' }],
  ['duy', 'backpack', { title: 'Balo laptop 15.6 inch chống sốc', category: 'khac', price: 180000, meetingPoints: [N, LIB], preferredTimeSlots: [T4],
    description: 'Balo xám có ngăn chống sốc cho laptop 15.6 inch, nhiều ngăn phụ, có cổng sạc USB bên hông. Khoá kéo còn trơn.' }]
];

const WANTED = [
  ['ha', { title: 'Cần mua giáo trình Luật kinh doanh', category: 'sach', budgetMin: 30000, budgetMax: 60000, urgency: 'high', courseCode: 'LKD', courseName: 'Luật kinh doanh', faculty: 'Luật', meetingPoints: [A, LIB], preferredTimeSlots: [T2],
    description: 'Mình cần giáo trình Luật kinh doanh bản hiện hành để kịp ôn giữa kỳ. Có ghi chú càng tốt.' }],
  ['bao', { title: 'Tìm máy tính Casio fx-580VN X để thi cuối kỳ', category: 'dien-tu', budgetMin: 250000, budgetMax: 350000, urgency: 'high', meetingPoints: [A], preferredTimeSlots: [NOON],
    description: 'Cần một máy Casio 580 còn dùng tốt, không cần hộp. Hẹn ở Cơ sở A buổi trưa.' }],
  ['chau', { title: 'Cần laptop cũ dưới 6 triệu để học Excel, SPSS', category: 'dien-tu', budgetMin: 4000000, budgetMax: 6000000, urgency: 'medium', meetingPoints: [B, N], preferredTimeSlots: [PM],
    description: 'Ưu tiên ThinkPad hoặc Dell Latitude, RAM từ 8GB, có SSD. Pin dùng được khoảng 3 tiếng.' }],
  ['duy', { title: 'Tìm xe đạp cũ để đi lại ở Cơ sở N', category: 'xe', budgetMin: 500000, budgetMax: 1000000, urgency: 'medium', meetingPoints: [N], preferredTimeSlots: [PM],
    description: 'Cần xe đạp còn chạy tốt, phanh ổn, có giỏ càng tốt. Mình ở ký túc xá gần Cơ sở N.' }],
  ['ha', { title: 'Cần bàn học gấp gọn cho phòng trọ', category: 'do-dung', budgetMin: 100000, budgetMax: 250000, urgency: 'low', meetingPoints: [A, B], preferredTimeSlots: [T4],
    description: 'Tìm bàn học gấp hoặc bàn chân sắt nhỏ, mặt khoảng 60 x 40 cm. Có thể tự qua lấy.' }],
  ['bao', { title: 'Cần áo đồng phục Giáo dục thể chất size L', category: 'thoi-trang', budgetMin: 50000, budgetMax: 100000, urgency: 'medium', courseCode: 'GDTC', courseName: 'Giáo dục thể chất', meetingPoints: [A, CAN], preferredTimeSlots: [T2],
    description: 'Cần một áo GDTC size L còn mặc được để học kỳ này. Không cần mới.' }]
];

const HOUR = 3600 * 1000;

function build(sellerIds) {
  const docs = [];
  SELL.forEach(([who, photo, f], i) => docs.push({
    listingType: 'sell', condition: 'used', status: 'available', ...f,
    location: f.meetingPoints[0],
    images: [`/images/samples/${photo}.jpg`],
    description: `${f.description}\n\nẢnh minh hoạ: ${PHOTO[photo]}, Wikimedia Commons.\n${MARK}`,
    seller: sellerIds[who],
    createdAt: new Date(Date.now() - (i * 19 + 2) * HOUR) // spread over the last ~3 weeks, newest first
  }));
  WANTED.forEach(([who, f], i) => docs.push({
    listingType: 'wanted', condition: 'used', status: 'available', ...f,
    location: f.meetingPoints[0],
    images: [],
    description: `${f.description}\n\n${MARK}`,
    seller: sellerIds[who],
    createdAt: new Date(Date.now() - (i * 31 + 5) * HOUR)
  }));
  return docs;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI (đặt trong .env hoặc biến môi trường).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const markRe = new RegExp(MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (remove) {
    const existing = await Product.find({ description: markRe }).select('title').lean();
    existing.forEach((p) => console.log('  xoá:', p.title));
    if (apply) {
      const r = await Product.deleteMany({ description: markRe });
      console.log(`Đã xoá ${r.deletedCount} tin mẫu.`);
    } else {
      console.log(`${existing.length} tin mẫu sẽ bị xoá. Chạy lại với --apply để xoá thật.`);
    }
    return mongoose.disconnect();
  }

  const sellerIds = {};
  for (const [key, s] of Object.entries(SELLERS)) {
    let user = await User.findOne({ email: s.email }).select('_id');
    if (!user) {
      console.log(`  ${apply ? 'tạo' : 'sẽ tạo'} tài khoản người bán ${s.email} (mật khẩu ngẫu nhiên, không đăng nhập được)`);
      if (apply) user = await User.create({ ...s, password: crypto.randomBytes(24).toString('base64url') });
    }
    sellerIds[key] = user ? user._id : new mongoose.Types.ObjectId();
  }

  const docs = build(sellerIds);
  const already = new Set((await Product.find({ description: markRe }).select('title').lean()).map((p) => p.title));
  const fresh = docs.filter((d) => !already.has(d.title));
  fresh.forEach((d) => console.log(`  ${d.listingType === 'sell' ? 'bán ' : 'cần '} ${d.title}`));
  console.log(`${fresh.length} tin mới, ${docs.length - fresh.length} tin đã có sẵn (bỏ qua).`);
  if (apply && fresh.length) {
    // timestamps: false keeps the spread-out createdAt dates instead of stamping everything "now"
    await Product.insertMany(fresh, { timestamps: false });
    console.log(`Đã thêm ${fresh.length} tin mẫu.`);
  } else if (!apply) {
    console.log('Đây là chạy thử. Thêm --apply để ghi vào database.');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
