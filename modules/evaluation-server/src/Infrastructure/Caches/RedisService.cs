using System.Text.Json;
using MongoDB.Bson;
using StackExchange.Redis;

namespace Infrastructure.Caches;

public class RedisService
{
    private readonly IDatabase _redis;

    public RedisService(IConnectionMultiplexer multiplexer)
    {
        _redis = multiplexer.GetDatabase();
    }

    public async Task UpsertFlagAsync(JsonElement flag)
    {
        // upsert flag
        var cache = RedisCaches.Flag(flag);
        await _redis.StringSetAsync(cache.Key, cache.Value);

        // upsert index
        var index = RedisCaches.FlagIndex(flag);
        await _redis.SortedSetAddAsync(index.Key, index.Value, index.Score);
    }

    public async Task DeleteFlagAsync(Guid envId, Guid flagId)
    {
        // delete cache
        var cacheKey = RedisKeys.FeatureFlag(flagId);
        await _redis.KeyDeleteAsync(cacheKey);

        // delete index
        var index = RedisKeys.FlagIndex(envId);
        await _redis.SortedSetRemoveAsync(index, flagId.ToString());
    }

    public async Task UpsertSegmentAsync(BsonDocument segment)
    {
        // upsert cache
        var cache = RedisCaches.Segment(segment);
        await _redis.StringSetAsync(cache.Key, cache.Value);

        // upsert index
        var index = RedisCaches.SegmentIndex(segment);
        await _redis.SortedSetAddAsync(index.Key, index.Value, index.Score);
    }
    
    public async Task UpsertSegmentAsync(JsonElement segment)
    {
        // upsert cache
        var cache = RedisCaches.Segment(segment);
        await _redis.StringSetAsync(cache.Key, cache.Value);

        // upsert index
        var index = RedisCaches.SegmentIndex(segment);
        await _redis.SortedSetAddAsync(index.Key, index.Value, index.Score);
    }

    public async Task DeleteSegmentAsync(Guid envId, Guid segmentId)
    {
        // delete cache
        var cacheKey = RedisKeys.Segment(segmentId);
        await _redis.KeyDeleteAsync(cacheKey);

        // delete index
        var index = RedisKeys.SegmentIndex(envId);
        await _redis.SortedSetRemoveAsync(index, segmentId.ToString());
    }
}