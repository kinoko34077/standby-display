import test from "node:test";
import assert from "node:assert/strict";
import { bindNumericRangeControl } from "../scripts/settings-ui.mjs";
import { CLOCK_LETTER_SPACING_CONTROL, CLOCK_SIZE_CONTROL } from "../scripts/constants.mjs";

function fakeControl() {
  const listeners = new Map();
  return {
    value:"", min:"", max:"", step:"",
    addEventListener(type, fn) { listeners.set(type, fn); },
    emit(type, extra={}) { listeners.get(type)?.({ target:this, ...extra }); },
    blur() { this.emit("blur"); },
  };
}

test("the same numeric binding synchronizes clock size slider and direct edit", () => {
  const slider=fakeControl(), field=fakeControl(), events=[];
  const control=bindNumericRangeControl(slider,field,CLOCK_SIZE_CONTROL,100,v=>events.push(v));
  control.render(120,null);
  assert.equal(slider.value,"120");
  assert.equal(field.value,"120");
  field.value="125";
  field.emit("change");
  assert.deepEqual(events,[125]);
  assert.equal(slider.value,"125");
  slider.emit("pointerdown");
  slider.value="99";
  slider.emit("input");
  assert.equal(events.at(-1),100);
  slider.emit("pointerup");
  slider.value="101";
  slider.emit("input");
  assert.equal(events.at(-1),101);
  assert.equal(field.value,"101");
  field.value="300";
  field.emit("change");
  assert.equal(events.at(-1),CLOCK_SIZE_CONTROL.max);
});

test("letter spacing has a gentle zero snap for dragging, exact direct value and editing preservation", () => {
  const slider=fakeControl(), field=fakeControl(), events=[];
  const control=bindNumericRangeControl(slider,field,CLOCK_LETTER_SPACING_CONTROL,0,v=>events.push(v));
  control.render(-0.1,null);
  slider.emit("pointerdown");
  slider.value="0.01";
  slider.emit("input");
  assert.equal(events.at(-1),0);
  slider.value="0.02";
  slider.emit("input");
  assert.equal(events.at(-1),0.02);
  slider.emit("pointerup");
  slider.value="0.01";
  slider.emit("input");
  assert.equal(events.at(-1),0.01);
  field.value="0.01";
  field.emit("change");
  assert.equal(events.at(-1),0.01);
  field.value="-";
  control.render(0.05,field);
  assert.equal(field.value,"-");
  field.emit("blur");
  assert.equal(field.value,"0.05");
  field.value="-0.999";
  field.emit("change");
  assert.equal(events.at(-1),CLOCK_LETTER_SPACING_CONTROL.min);
});
