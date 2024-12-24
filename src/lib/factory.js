import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

const providerRegistry = {};

const Factory = GObject.registerClass(
  {
    Signals: {
      'registry-update': {}
    }
  },
  class Factory extends GObject.Object {
    _init(params = {}) {
      super._init(params);
      this.providers = {};
    }

    registerProvider(id, createFunction, owner) {
      this.providers[id] = {
        id: id,
        create: createFunction,
        owner: owner
      };
      this.emit('registry-update');
    }

    unregisterProvider(owner) {
      Object.keys(this.providers).forEach((k) => {
        if (this.providers[id].owner == owner) {
          delete this.providers[id];
        }
      });
    }

    create(id, config = {}) {
      if (this.providers[id]) {
        let item = this.providers[id].create(config);
        item.id = config.id ?? id;
        console.log(config);
        return item;
      }
      return null;
    }
  },
);

export default Factory;
