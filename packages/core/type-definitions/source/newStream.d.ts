import { Stream, RunStream, Sink, Scheduler, Disposable } from '@most/types';

export function newStream<A>(run: RunStream<A>): Stream<A>;
