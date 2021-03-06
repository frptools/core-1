require('babel-register')
const Benchmark = require('benchmark');
const {chain, fromArray} = require('.././index');
const {reduce} = require('.././combinator/reduce')
const rx = require('rx');
const rxjs = require('@reactivex/rxjs')
const kefir = require('kefir');
const bacon = require('baconjs');
const highland = require('highland');
const xs = require('xstream').default;

const runners = require('./runners');
const kefirFromArray = runners.kefirFromArray;
const xstreamFlattenConcurrently = require('xstream/extra/flattenConcurrently').default;

// flatMapping n streams, each containing m items.
// Results in a single stream that merges in n x m items
// In Array parlance: Take an Array containing n Arrays, each of length m,
// and flatten it to an Array of length n x m.
const mn = runners.getIntArg2(1000, 1000);
const a = build(mn[0], mn[1]);

function build(m, n) {
  const a = new Array(n);
  for(let i = 0; i< a.length; ++i) {
    a[i] = buildArray(i*1000, m);
  }
  return a;
}

function buildArray(base, n) {
  const a = new Array(n);
  for(let i = 0; i< a.length; ++i) {
    a[i] = base + i;
  }
  return a;
}

const suite = Benchmark.Suite('chain ' + mn[0] + ' x ' + mn[1] + ' streams');
const options = {
  defer: true,
  onError: function(e) {
    e.currentTarget.failure = e.error;
  }
};

suite
  .add('most', function(deferred) {
    runners.runMost(deferred, reduce(sum, 0, chain(fromArray, fromArray(a))));
  }, options)
  .add('rx 4', function(deferred) {
    runners.runRx(deferred, rx.Observable.fromArray(a).flatMap(rx.Observable.fromArray).reduce(sum, 0));
  }, options)
  .add('rx 5', function(deferred) {
    runners.runRx5(deferred,
      rxjs.Observable.from(a).flatMap(
        function(x) {return rxjs.Observable.from(x)}).reduce(sum, 0))
  }, options)
  .add('xstream', function(deferred) {
    runners.runXstream(deferred, xs.fromArray(a).map(xs.fromArray).compose(xstreamFlattenConcurrently).fold(sum, 0).last());
  }, options)
  .add('kefir', function(deferred) {
    runners.runKefir(deferred, kefirFromArray(a).flatMap(kefirFromArray).scan(sum, 0).last());
  }, options)
  .add('bacon', function(deferred) {
    runners.runBacon(deferred, bacon.fromArray(a).flatMap(bacon.fromArray).reduce(0, sum));
  }, options)
  .add('highland', function(deferred) {
    runners.runHighland(deferred, highland(a).flatMap(highland).reduce(0, sum));
  }, options);

runners.runSuite(suite);

function sum(x, y) {
  return x + y;
}

function even(x) {
  return x % 2 === 0;
}

function identity(x) {
  return x;
}
