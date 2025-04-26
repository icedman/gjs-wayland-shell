// adapted from https://github.com/jderose9/dash-to-panel
// adapted from https://github.com/micheleg/dash-to-dock
// adapted from https://github.com/icedman/dash2dock-lite

import Gdk from "gi://Gdk?version=4.0";
import Gtk from "gi://Gtk?version=4.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Cairo from "gi://cairo";

import { Drawing } from "./drawing.js";

export const Dot = GObject.registerClass(
  {},
  class Dot extends Gtk.DrawingArea {
    _init(x) {
      super._init({
        name: "dotCanvas",
        hexpand: true,
        vexpand: true,
      });

      this.add_css_class("dots");

      this.size = 200;
      this.set_draw_func(this.on_draw.bind(this));
      this.set_size_request(this.size, this.size);

      this.state = {};

      this._padding = 8;
      this._barHeight = 3;
    }

    set_state(s) {
      if (
        !this.state ||
        this.state.count != s.count ||
        this.state.color != s.color ||
        this.state.style != s.style ||
        this.state.rotate != s.rotate ||
        this.state.translate != s.translate
      ) {
        this.state = {
          ...this.state,
          ...s,
        };
        if (!this.state.style) {
          this.visible = false;
          return;
        }
        this.visible = true;
        this.queue_draw();
      }
    }

    on_draw(area, ctx, width, height) {
      if (
        !this.state ||
        !this.state.color ||
        !this.state.count ||
        !width ||
        !height
      )
        return;

      this.size = width;
      const dot_color = this.state.color;

      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      ctx.save();

      ctx.translate(width / 2, height / 2);
      if (this.state.translate) {
        ctx.translate(
          this.state.translate[0] * width,
          this.state.translate[1],
        ) * height;
      }
      if (this.state.rotate) {
        ctx.rotate((this.state.rotate * 3.14) / 180);
      }
      ctx.translate(-width / 2, -height / 2);

      // _draw_dot...
      let func = this[`_draw_${this.state.style}`];
      if (typeof func === "function") {
        func.bind(this)(ctx, this.state);
      }

      ctx.restore();

      ctx.$dispose();
    }

    destroy() {}

    _draw_segmented(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight;
      let width = size - this._padding * 2;
      ctx.translate(this._padding, size - height);

      let sz = width / 20;
      let spacing = Math.ceil(width / 18); // separation between the dots
      let dashLength = Math.ceil((width - (count - 1) * spacing) / count);
      let lineLength = width - sz * (count - 1) - spacing * (count - 1);

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.rectangle(i * dashLength + i * spacing, 0, dashLength, height);
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_solid(ctx, state) {
      this._draw_segmented(ctx, { ...state, count: 1 });
    }

    _draw_dashes(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight + 2;
      let width = size - this._padding * 2;

      let sz = width / 14;
      let spacing = Math.ceil(width / 16); // separation between the dots
      let dashLength = Math.floor(width / 4) - spacing;

      ctx.translate(
        Math.floor((size - count * dashLength - (count - 1) * spacing) / 2),
        size - height,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.rectangle(i * dashLength + i * spacing, 0, dashLength, sz);
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_dash(ctx, state) {
      this._draw_dashes(ctx, { ...state, count: 1 });
    }

    _draw_squares(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight + 3;
      let width = size - this._padding * 2;

      let spacing = Math.ceil(width / 18); // separation between the dots
      let dashLength = height;

      ctx.translate(
        Math.floor((size - count * dashLength - (count - 1) * spacing) / 2),
        size - height,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.rectangle(i * dashLength + i * spacing, 0, dashLength, height);
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_square(ctx, state) {
      this._draw_squares(ctx, { ...state, count: 1 });
    }

    _draw_triangles(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight + 2;
      let width = size - this._padding * 2;

      let spacing = Math.ceil(width / 16); // separation between the dots
      let dashLength = height + 8;

      ctx.translate(
        Math.floor((size - count * dashLength - (count - 1) * spacing) / 2),
        size - height,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.moveTo(i * dashLength + i * spacing + dashLength / 2, 0);
        ctx.lineTo(i * dashLength + i * spacing, height);
        ctx.lineTo(i * dashLength + i * spacing + dashLength, height);
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_triangle(ctx, state) {
      this._draw_triangles(ctx, { ...state, count: 1 });
    }

    _draw_diamonds(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight + 6;
      let width = size - this._padding * 2;

      let spacing = Math.ceil(width / 16); // separation between the dots
      let dashLength = height;

      ctx.translate(
        Math.floor((size - count * dashLength - (count - 1) * spacing) / 2),
        size - height,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.moveTo(i * dashLength + i * spacing + dashLength / 2, 0);
        ctx.lineTo(i * dashLength + i * spacing, height / 2);
        ctx.lineTo(i * dashLength + i * spacing + dashLength / 2, height);
        ctx.lineTo(i * dashLength + i * spacing + dashLength, height / 2);
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_diamond(ctx, state) {
      this._draw_diamonds(ctx, { ...state, count: 1 });
    }

    _draw_dots(ctx, state) {
      let size = this.size;
      let count = state.count;
      if (count > 4) count = 4;
      let height = this._barHeight;
      let width = size - this._padding * 2;

      let spacing = Math.ceil(width / 18); // separation between the dots
      let radius = height;

      ctx.translate(
        Math.floor(
          (size - count * radius - (count - 1) * spacing) / 2 - radius / 2,
        ),
        size - height,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        ctx.arc(
          (2 * i + 1) * radius + i * radius,
          -radius,
          radius,
          0,
          2 * Math.PI,
        );
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }

    _draw_dot(ctx, state) {
      this._draw_dots(ctx, { ...state, count: 1 });
    }

    _draw_binary(ctx, state) {
      let size = this.size;
      let count = 4;
      let n = Math.min(15, state.count);
      let binaryValue = String("0000" + (n >>> 0).toString(2)).slice(-4);

      let height = this._barHeight + 2;
      let width = size - this._padding * 2;

      let spacing = Math.ceil(width / 14); // separation between the dots
      let dashLength = height * 1.4;
      let radius = height * 0.9;

      ctx.translate(
        Math.floor((size - count * dashLength - (count - 1) * spacing) / 2),
        size - height - radius / 2,
      );

      for (let i = 0; i < count; i++) {
        ctx.newSubPath();
        if (binaryValue[i] == "1") {
          ctx.arc(
            i * dashLength + i * spacing + dashLength / 2,
            radius / 2,
            radius,
            0,
            2 * Math.PI,
          );
        } else {
          ctx.rectangle(
            i * dashLength + i * spacing,
            0,
            dashLength,
            height - 2,
          );
        }
      }

      ctx.strokePreserve();
      Drawing.set_color(ctx, state.color, state.color[3]);
      ctx.fill();
    }
  },
);
