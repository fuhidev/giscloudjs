import { Evented } from './Evented';

export class Accessor extends Evented {
  private _initHooksCalled = false;
  // callInitHooks  () {

  // 	if (this._initHooksCalled) { return; }

  // 	// if (parentProto.callInitHooks) {
  // 	// 	parentProto.callInitHooks.call(this);
  // 	// }

  // 	this._initHooksCalled = true;

  // 	for (let i = 0, len = proto._initHooks.length; i < len; i++) {
  // 		proto._initHooks[i].call(this);
  // 	}
  // }
}
