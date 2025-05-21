## redis cluster batch actions
this is a small wrap base on node-redis

usage

```typescript

const cluster = await RedisClusterBatch.init({
  host: "redis-cluster",
  port: 6379,
  slotsRefreshInterval: 5000,
});


// use batch action
await cluster.mSetPx(
  {
    key1: "value1",
  },
  7000
);
const result = await cluster.mGet(["key1"]);

// use node-redis client
await cluster.client.set("key1", "value1");
await cluster.client.get("key1");

```


## redis cluster mget/mset 
auto manage cluster slots

4 nodes cluster with mget 4000 keys will send with 4 mget query to each cluster node

## benchmark
cpu-i5-12490 mem-32GB
benchmark results:
ClusterSetWithTTLPipeline50 x 3,001 ops/sec ±1.13% (602 runs sampled) Latency: 0.32ms
ClusterSetWithTTLWithLua50 x 3,497 ops/sec ±1.22% (614 runs sampled) Latency: 0.27ms
ClusterSetWithTTLWithoutBatch50 x 2,150 ops/sec ±2.16% (604 runs sampled) Latency: 0.45ms

ClusterSetWithTTLPipeline5000 x 51.54 ops/sec ±1.41% (590 runs sampled) Latency: 19.36ms                              
ClusterSetWithTTLWithLua5000 x 123 ops/sec ±1.98% (606 runs sampled) Latency: 8.08ms
ClusterSetWithTTLWithoutBatch5000 x 17.73 ops/sec ±2.21% (564 runs sampled) Latency: 56.26ms

