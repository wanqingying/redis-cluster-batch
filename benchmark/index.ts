import { RedisClusterBatch } from "../lib";
import Benchmark from "benchmark";

/**
 *
cpu-i5-12490 mem-32GB
benchmark results:
ClusterSetWithTTLPipeline50 x 3,001 ops/sec ±1.13% (602 runs sampled) Latency: 0.32ms
ClusterSetWithTTLWithLua50 x 3,497 ops/sec ±1.22% (614 runs sampled) Latency: 0.27ms
ClusterSetWithTTLWithoutBatch50 x 2,150 ops/sec ±2.16% (604 runs sampled) Latency: 0.45ms

ClusterSetWithTTLPipeline5000 x 51.54 ops/sec ±1.41% (590 runs sampled) Latency: 19.36ms                              
ClusterSetWithTTLWithLua5000 x 123 ops/sec ±1.98% (606 runs sampled) Latency: 8.08ms
ClusterSetWithTTLWithoutBatch5000 x 17.73 ops/sec ±2.21% (564 runs sampled) Latency: 56.26ms
 *
 */

const token = Symbol("test");

async function benchmarkTest() {
  const cluster = await RedisClusterBatch.init({
    host: "redis-cluster",
    port: 6379,
    slotsRefreshInterval: 5000,
  });

  function getkv(len: number = 5000) {
    return Object.fromEntries(
      Array.from({ length: len }, (_, i) => {
        const random = Math.random().toString(36).slice(2);
        return [`key${i}${random}`, `value${i}`];
      })
    );
  }

  async function testWithSize(size: number) {
    const kv = getkv(size);
    const keys = Array.from(Object.keys(kv));

    const suitePipeline = new Benchmark.Suite();
    const suiteLua = new Benchmark.Suite();
    const suiteClientSet = new Benchmark.Suite();

    await cluster.mSetPx(
      {
        key1: "value1",
      },
      70000
    );
    const result = await cluster.mGet(["key1"]);
    console.log("result", result);

    async function runSuite(s: Benchmark.Suite) {
      return new Promise<void>((resolve) => {
        s.on("complete", function () {
          resolve();
        }).run({ async: true });
      });
    }
    let suite1Latency = 0;
    let suite1Count = 0;

    let suite2Latency = 0;
    let suite2Count = 0;

    let suite3Latency = 0;
    let suite3Count = 0;

    suitePipeline
      .add("ClusterSetWithTTLPipeline" + size, {
        fn: async function (deferred: Benchmark.Deferred) {
          const start = Date.now();
          await cluster.pipe(keys, (p, keys, hashKeys) => {
            keys.forEach((k, i) => {
              p.set(hashKeys[i], kv[k], {
                PX: 60000,
              });
            });
          });
          suite1Latency += Date.now() - start;
          suite1Count++;
          deferred.resolve();
        },
        defer: true,
        minSamples: 500,
        maxTime: 8,
      })
      .on("cycle", function (event: Event) {
        const avg = Math.floor((suite1Latency / suite1Count) * 100) / 100;
        console.log(String(event.target) + ` Latency: ${avg}ms`);
      });
    suiteLua
      .add("ClusterSetWithTTLWithLua" + size, {
        fn: async function (deferred: Benchmark.Deferred) {
          const start = Date.now();
          await cluster.mSetPx(kv, 60000);
          suite2Latency += Date.now() - start;
          suite2Count++;
          deferred.resolve();
        },
        defer: true,
        minSamples: 500,
        maxTime: 8,
      })
      .on("cycle", function (event: Event) {
        const avg = Math.floor((suite2Latency / suite2Count) * 100) / 100;
        console.log(String(event.target) + ` Latency: ${avg}ms`);
      });

    suiteClientSet
      .add("ClusterSetWithTTLWithoutBatch" + size, {
        fn: async function (deferred: Benchmark.Deferred) {
          const start = Date.now();
          await Promise.all(
            keys.map(async (k) => {
              await cluster.client.set(k, kv[k], {
                PX: 60000,
              });
            })
          );
          suite3Latency += Date.now() - start;
          suite3Count++;
          deferred.resolve();
        },
        defer: true,
        minSamples: 500,
        maxTime: 8,
      })
      .on("cycle", function (event: Event) {
        const avg = Math.floor((suite3Latency / suite3Count) * 100) / 100;
        console.log(String(event.target) + ` Latency: ${avg}ms`);
      });

    await runSuite(suitePipeline);
    await runSuite(suiteLua);
    await runSuite(suiteClientSet);
  }
  await testWithSize(50);
  await testWithSize(5000);
}

benchmarkTest()
  .catch(console.error)
  .finally(() => {
    console.log("done");
    process.exit(0);
  });
