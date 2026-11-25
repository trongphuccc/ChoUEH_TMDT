// Escape user input before putting it in a RegExp / Mongo $regex (prevents ReDoS and regex errors).
module.exports = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
