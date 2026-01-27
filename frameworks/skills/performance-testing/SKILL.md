---
name: performance-testing
description: |
  Performance testing and profiling techniques for Unreal Engine games.
  Use when analyzing FPS, memory, or optimization issues.
---

# Performance Testing

## When to Use

- FPS drops or stuttering
- Memory issues or leaks
- Load time optimization
- Platform certification prep

## Target Metrics

| Platform | Target FPS | Frame Budget |
|----------|------------|--------------|
| PC (High) | 60+ | 16.6ms |
| PC (Low) | 30+ | 33.3ms |
| Console | 30/60 | 33.3/16.6ms |
| Mobile | 30/60 | 33.3/16.6ms |
| VR | 90+ | 11.1ms |

## Profiling Tools

### Unreal Profiler

```
Console: stat unit
- Frame: Total frame time
- Game: Game thread
- Draw: Render thread
- GPU: GPU time
- RHIT: Render Hardware Interface
```

### Stat Commands

```
stat fps           # FPS counter
stat unit          # Frame time breakdown
stat unitgraph     # Visual graph
stat game          # Game thread details
stat gpu           # GPU stats
stat memory        # Memory usage
stat particles     # Particle stats
stat streaming     # Texture streaming
```

### Unreal Insights

1. Launch with `-trace=default,memory`
2. Open Unreal Insights
3. Analyze timing data

## Common Bottlenecks

### CPU Bound (Game Thread)

**Symptoms:**
- Game time > Frame budget
- GPU idle

**Common Causes:**
- Too many actors ticking
- Complex AI calculations
- Physics simulations
- Garbage collection

**Solutions:**
- Reduce tick frequency
- Use async tasks
- Pool objects
- Optimize algorithms

### CPU Bound (Render Thread)

**Symptoms:**
- Draw time high
- Many draw calls

**Common Causes:**
- Too many unique materials
- No instancing
- Complex shaders
- Overdraw

**Solutions:**
- Merge materials
- Use instanced meshes
- LOD systems
- Occlusion culling

### GPU Bound

**Symptoms:**
- GPU time > Frame budget
- CPU idle

**Common Causes:**
- High poly count
- Complex shaders
- Large textures
- Post-processing

**Solutions:**
- Reduce poly count
- Simplify shaders
- Texture streaming
- Reduce post-process

## Memory Optimization

### Memory Stats

```
stat memory
stat memoryplatform
memreport -full
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Texture memory | Large textures | Streaming, compression |
| Mesh memory | High poly | LODs, Nanite |
| Audio memory | Uncompressed | Compression, streaming |
| Blueprint memory | Large BPs | Nativize, split |

## Performance Checklist

### Before Profiling
- [ ] Build in Development/Shipping
- [ ] Disable editor overhead
- [ ] Use target hardware
- [ ] Consistent test scenario

### General
- [ ] 60fps on target hardware
- [ ] No stutters > 100ms
- [ ] Memory under budget
- [ ] Load times acceptable

### Rendering
- [ ] Draw calls under limit
- [ ] Triangle count reasonable
- [ ] Texture memory in budget
- [ ] LODs properly configured

### Gameplay
- [ ] Tick optimized
- [ ] Object pooling used
- [ ] Async loading
- [ ] GC minimized

## Quick Wins

### Immediate Impact

1. **Disable unnecessary ticks**
   ```cpp
   PrimaryActorTick.bCanEverTick = false;
   ```

2. **Use timers instead of tick**
   ```cpp
   GetWorldTimerManager().SetTimer(...)
   ```

3. **Cache component references**
   ```cpp
   // Do once in BeginPlay
   MyMesh = FindComponentByClass<UStaticMeshComponent>();
   ```

4. **Reduce collision complexity**
   - Simple collision shapes
   - Collision channels

5. **LODs for everything**
   - Meshes
   - Materials
   - Particles

## Reporting

### Performance Report Format

```markdown
## Performance Report - [Date]

### Test Configuration
- Hardware: [specs]
- Build: [Development/Shipping]
- Scene: [test scene]

### Results
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| FPS | 60 | 55 | ⚠️ |
| Frame Time | 16.6ms | 18.2ms | ⚠️ |
| Memory | 4GB | 3.2GB | ✅ |

### Bottlenecks Identified
1. [Issue] - [Impact] - [Solution]

### Recommendations
1. [Action item]
```
