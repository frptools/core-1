/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

import Pipe from '../sink/Pipe'
import { withLocalTime } from '../combinator/withLocalTime'
import { disposeOnce, tryDispose } from '@most/disposable'

export const continueWith = (f, stream) =>
  new ContinueWith(f, stream)

class ContinueWith {
  constructor (f, source) {
    this.f = f
    this.source = source
  }

  run (runStream, sink, scheduler) {
    return new ContinueWithSink(this.f, runStream, this.source, sink, scheduler)
  }
}

class ContinueWithSink extends Pipe {
  constructor (f, runStream, source, sink, scheduler) {
    super(sink)
    this.f = f
    this.runStream = runStream
    this.scheduler = scheduler
    this.active = true
    this.disposable = disposeOnce(runStream(source, this, scheduler))
  }

  event (t, x) {
    if (!this.active) {
      return
    }
    this.sink.event(t, x)
  }

  end (t) {
    if (!this.active) {
      return
    }

    tryDispose(t, this.disposable, this.sink)

    this._startNext(t, this.sink)
  }

  _startNext (t, sink) {
    try {
      this.disposable = this._continue(this.f, t, sink)
    } catch (e) {
      sink.error(t, e)
    }
  }

  _continue (f, t, sink) {
    return this.runStream(withLocalTime(t, f()), sink, this.scheduler)
  }

  dispose () {
    this.active = false
    return this.disposable.dispose()
  }
}
