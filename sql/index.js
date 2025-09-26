export function IN(values) {
  return { $in: values };
}

export function LIKE(pattern) {
  return new RegExp(pattern, 'i');
}

export function BETWEEN(start, end) {
  return { $gte: start, $lte: end };
}
