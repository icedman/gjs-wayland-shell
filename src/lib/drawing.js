"use strict";

import PangoCairo from "gi://PangoCairo";
import Pango from "gi://Pango";

const NAMED_COLORS = {
  red: { r: 255, g: 0, b: 0, a: 255 },
  green: { r: 0, g: 255, b: 0, a: 255 },
  blue: { r: 0, g: 0, b: 255, a: 255 },
  black: { r: 0, g: 0, b: 0, a: 255 },
  white: { r: 255, g: 255, b: 255, a: 255 },
  // Add more named colors as needed
};

function colorFromString(colorString) {
  if (!colorString || typeof colorString !== "string") {
    throw new Error("Invalid color string");
  }

  colorString = colorString.trim().toLowerCase();

  // Check for named colors
  if (NAMED_COLORS[colorString]) {
    return { ...NAMED_COLORS[colorString] };
  }

  // Check for hex formats
  let match;

  // #RRGGBB
  match = /^#([0-9a-f]{6})$/i.exec(colorString);
  if (match) {
    const hex = match[1];
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      a: 255,
    };
  }

  // #RRGGBBAA
  match = /^#([0-9a-f]{8})$/i.exec(colorString);
  if (match) {
    const hex = match[1];
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      a: parseInt(hex.substring(6, 8), 16),
    };
  }

  // #RGB
  match = /^#([0-9a-f]{3})$/i.exec(colorString);
  if (match) {
    const hex = match[1];
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 255,
    };
  }

  // #RGBA
  match = /^#([0-9a-f]{4})$/i.exec(colorString);
  if (match) {
    const hex = match[1];
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: parseInt(hex[3] + hex[3], 16),
    };
  }

  throw new Error("Invalid color format");
}

// Example usage
// try {
//     console.log(colorFromString('#3498db')); // { r: 52, g: 152, b: 219, a: 255 }
//     console.log(colorFromString('red'));     // { r: 255, g: 0, b: 0, a: 255 }
//     console.log(colorFromString('#abc'));    // { r: 170, g: 187, b: 204, a: 255 }
//     console.log(colorFromString('#abcd'));   // { r: 170, g: 187, b: 204, a: 221 }
// } catch (e) {
//     console.error(e.message);
// }

function draw_rotated_line(ctx, color, width, angle, len, offset) {
  offset = offset || 0;
  ctx.save();
  ctx.rotate(angle);
  set_color(ctx, color, 1);
  ctx.setLineWidth(width);
  ctx.moveTo(0, offset);
  ctx.lineTo(0, len);
  ctx.stroke();
  ctx.restore();
}

function draw_line(ctx, color, width, x, y, x2, y2) {
  ctx.save();
  set_color(ctx, color, 1);
  ctx.setLineWidth(width);
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function draw_circle(ctx, color, x, y, diameter, line_width) {
  ctx.save();
  set_color(ctx, color, 1);
  ctx.arc(x, y, diameter / 2 - diameter / 20, 0, 2 * Math.PI);
  ctx.setLineWidth(line_width || 0);
  if (line_width > 0) {
    ctx.stroke();
  } else {
    ctx.fill();
  }
  ctx.restore();
}

function draw_rounded_rect(
  ctx,
  color,
  x,
  y,
  h_size,
  v_size,
  line_width,
  border_radius,
) {
  ctx.save();
  set_color(ctx, color, 1);
  ctx.translate(x, y);
  ctx.setLineWidth(line_width || 0);
  ctx.moveTo(border_radius, 0);
  ctx.lineTo(h_size - border_radius, 0);
  // ctx.lineTo(h_size, border_radius);
  ctx.curveTo(h_size - border_radius, 0, h_size, 0, h_size, border_radius);
  ctx.lineTo(h_size, v_size - border_radius);
  // ctx.lineTo(h_size - border_radius, h_size);
  ctx.curveTo(
    h_size,
    v_size - border_radius,
    h_size,
    v_size,
    h_size - border_radius,
    v_size,
  );
  ctx.lineTo(border_radius, v_size);
  // ctx.lineTo(0, h_size - border_radius);
  ctx.curveTo(border_radius, v_size, 0, v_size, 0, v_size - border_radius);
  ctx.lineTo(0, border_radius);
  ctx.curveTo(0, border_radius, 0, 0, border_radius, 0);
  if (line_width == 0) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function draw_rect(ctx, color, x, y, h_size, v_size, line_width) {
  ctx.save();
  set_color(ctx, color, 1);
  ctx.translate(x, y);
  ctx.setLineWidth(line_width || 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(h_size, 0);
  ctx.lineTo(h_size, v_size);
  ctx.lineTo(0, v_size);
  ctx.lineTo(0, 0);
  if (line_width == 0) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function draw_text(ctx, showtext, font = "DejaVuSans 42") {
  ctx.save();
  let pl = PangoCairo.create_layout(ctx);
  pl.set_text(showtext, -1);
  pl.set_font_description(Pango.FontDescription.from_string(font));
  PangoCairo.update_layout(ctx, pl);
  let [w, h] = pl.get_pixel_size();
  ctx.relMoveTo(-w / 2, -h / 2);
  PangoCairo.show_layout(ctx, pl);
  ctx.relMoveTo(w / 2, 0);
  ctx.restore();
  return [w, h];
}

function set_color(ctx, clr, alpha) {
  if (typeof clr === "string") {
    const cc = colorFromString(clr);
    ctx.setSourceRGBA(cc.r, cc.g, cc.b, cc.a);
  } else {
    if (clr.red) {
      ctx.setSourceRGBA(clr.red, clr.green, clr.blue, alpha);
    } else {
      ctx.setSourceRGBA(clr[0], clr[1], clr[2], alpha);
    }
  }
}

function set_color_rgba(ctx, red, green, blue, alpha) {
  ctx.setSourceRGBA(red, green, blue, alpha);
}

export const Drawing = {
  set_color,
  set_color_rgba,
  draw_rotated_line,
  draw_line,
  draw_circle,
  draw_rect,
  draw_rounded_rect,
  draw_text,
};
