// One-off cleanup: listings marked "Đã bán"/"Đã cọc" (transactionStatus) before the status sync
// was added still have status 'available', so they keep showing on the public list.
//
//   node fix-sold-status.js            -> dry run, only lists what would change
//   node fix-sold-status.js --apply    -> writes the changes
//
// Only fixes that one direction. Listings whose status was changed by hand are left alone.
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

const FIXES = [
  { transactionStatus: 'sold', status: 'sold' },
  { transactionStatus: 'deposited', status: 'reserved' }
];

(async () => {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI (đặt trong .env hoặc biến môi trường).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  let total = 0;
  for (const { transactionStatus, status } of FIXES) {
    const filter = { transactionStatus, status: { $ne: status } };
    const stale = await Product.find(filter).select('title status transactionStatus').lean();
    stale.forEach((p) => console.log(`  ${p.status} -> ${status}  ${p.title}`));
    total += stale.length;
    if (apply && stale.length) await Product.updateMany(filter, { $set: { status } });
  }

  console.log(total === 0
    ? 'Không có tin nào cần sửa.'
    : apply ? `Đã sửa ${total} tin.` : `${total} tin cần sửa. Chạy lại với --apply để ghi.`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
