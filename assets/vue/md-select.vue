<template>
  <div class="input-field col" :class="cols">
    <div class="select-wrapper">
      <span class="caret">&#9660;</span>
      <input :value="textValue" @keydown="keydown" @focus="activate()" :disabled="disabled" readonly="true" class="select-dropdown" type="text" v-el:input>
      <ul class="dropdown-content select-dropdown" :class="{active: active}" v-el:dropdown>
        <li class="disabled"><span>Choose your option</span></li>
        <slot></slot>
      </ul>
    </div>
    <label for="form_connection_id">{{label}}</label>
  </div>
</template>
<script>
module.exports = {
  props: ["cols", "id", "name", "label", "value"],
  data: function() {
    return {active: false, textValue: "", options: []};
  },
  events: {
    "option::added": function(opt) {
      if (opt.selected) {
        this.$children.forEach(function(o) { if (o != opt) o.selected = false; });
        this.setValue(opt);
      }
      else if (!this.$children.filter(function(o) { return o.selected }).length) {
        this.setValue(this.$children[0]);
      }
      this.activate(false);
      this.options.push({selected: opt.selected, value: opt.value});
    },
    "option::removed": function(opt) {
      var next;
      for (i = 0; i < this.$children.length; i++) {
        var o = this.$children[i];
        if (o == opt) continue;
        if (!next) next = o;
        if (o.selected) next = o;
      }
      this.options = this.options.filter(function(o) { return o.value != opt.value; });
      if (next) this.setValue(next);
    },
    "option::selected": function(opt) {
      this.activate(false);
      this.$children.forEach(function(o) { if (o != opt) o.selected = false; });
      this.options.forEach(function(o) { o.selected = opt.value == o.value; });
      this.setValue(opt);
    }
  },
  methods: {
    activate: function(e) {
      this.active = arguments.length ? arguments[0] : !this.active;
      if (!this.active) return;
      this.$els.dropdown.style.width = this.$els.input.offsetWidth + "px";
    },
    deactivate: function(e) {
      var $target = $(e.target);
      if ($target.closest("li.disabled").length) this.active = false;
      if (!$target.closest(this.$el).length) this.active = false;
    },
    keydown: function(e) {
      switch (e.keyCode) {
        case 9: // tab
          this.active = false;
          break;
      }
    },
    setValue: function(opt) {
      this.value = opt ? opt.value : "";
      this.textValue = opt ? opt.text() || opt.value : "";
      this.allowChangeEvent = true;
      this.$nextTick(function() {
        if (this.allowChangeEvent) this.$emit("change", this.value);
        this.allowChangeEvent = false; // avoid duplicates
      });
      return this; // allow chaining
    }
  },
  watch: {
    value: function(v, o) {
      var selected = false;
      while (1) {
        this.$children.forEach(function(o) { selected = selected || (o.selected = o.value == v); });
        this.options.forEach(function(o) { selected = selected || (o.selected = o.value == v); });
        if (selected || !this.options.length) break;
        v = this.options[0].value;
      }
    }
  },
  detached: function() {
    $(document).off("click", this.deactivate);
  },
  ready: function() {
    if (!this.cols) this.cols = "s12";
    $(document).on("click", this.deactivate);
  }
};
</script>
