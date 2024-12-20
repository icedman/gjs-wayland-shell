function pointInRectangle(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function distanceToRectangle(point, rect) {
  let rx = rect.x + rect.width / 2;
  let ry = rect.y + rect.height / 2;
  let dx = point.x - rx;
  let dy = point.y - ry;
  return Math.sqrt(dx * dx + dy * dy);
}

export { pointInRectangle, distanceToRectangle };
