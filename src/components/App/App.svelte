<script>
  import linearScale from 'simple-linear-scale';
  import { onDestroy, onMount } from 'svelte';

  export let dataURL;
  export let startVH;
  export let endVH;

  startVH = Math.max(0, Math.min(100, typeof startVH === 'number' ? startVH : 100));
  endVH = Math.max(0, Math.min(100, typeof endVH === 'number' ? endVH : 100));

  const noScale = () => 0;

  let config;
  let rootEl;
  let parentBlockEl;
  let isImageLoaded;
  let viewportHeight;
  let viewportWidth;
  let parentHeight;
  let parentTop;

  $: imageSrc = config ? `${dataURL.substr(0, dataURL.lastIndexOf('/') + 1)}${config.imageURL}` : null;

  $: domain = parentHeight
    ? [(startVH / 100) * viewportHeight, -parentHeight - (endVH / 100) * viewportHeight + viewportHeight]
    : null;

  $: xScale =
    config && domain
      ? config.beginAt.x > config.endAt.x
        ? linearScale([domain[1], domain[0]], [config.endAt.x, config.beginAt.x], true)
        : linearScale(domain, [config.beginAt.x, config.endAt.x], true)
      : noScale;

  $: yScale =
    config && domain
      ? config.beginAt.y > config.endAt.y
        ? linearScale([domain[1], domain[0]], [config.endAt.y, config.beginAt.y], true)
        : linearScale(domain, [config.beginAt.y, config.endAt.y], true)
      : noScale;

  $: zoom = config
    ? Math.max(viewportHeight / config.naturalViewport.height, viewportWidth / config.naturalViewport.width)
    : null;

  $: imageTransform = config ? `scale(${zoom}) translate(${-xScale(parentTop)}px, ${-yScale(parentTop)}px)` : null;

  const updateFactors = () => {
    // Pick the best height for device, assuming a height difference under
    // 200px signifies a browser with variable UI height such as iOS's Safari
    const _innerHeight = window.innerHeight;
    const _availHeight = window.screen.availHeight;

    viewportHeight = _availHeight && Math.abs(_availHeight - _innerHeight) < 200 ? _availHeight : _innerHeight;

    viewportWidth = window.innerWidth;

    parentHeight = parentBlockEl.getBoundingClientRect().height;
  };

  const updateTransform = () => {
    parentTop = parentBlockEl.getBoundingClientRect().top;
  };

  const updateAll = () => {
    updateFactors();
    updateTransform();
  };

  const schedulerBasedUpdate = client => (client.hasChanged ? updateAll : updateTransform)();

  const handleImageLoad = () => {
    isImageLoaded = true;
    window.__ODYSSEY__.scheduler.enqueue(updateAll);
    window.__ODYSSEY__.scheduler.subscribe(schedulerBasedUpdate);
  };

  const dataPromise = fetch(dataURL).then(response => response.json());

  onMount(() => {
    parentBlockEl = rootEl.closest('.Block');

    dataPromise.then(data => (config = data));
  });

  onDestroy(() => {
    window.__ODYSSEY__.scheduler.unsubscribe(schedulerBasedUpdate);
  });
</script>

<style>
  div {
    position: relative;
    overflow: hidden;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    background-color: #000;
  }

  :global(.is-fixed) div {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
  }

  img {
    opacity: 0;
    transform-origin: 0 0;
    transform: translate(0, 0) scale(1);
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: none !important;
    transition: opacity 1s;
  }

  img.loaded {
    opacity: 1;
  }
</style>

<div bind:this={rootEl}>
  <img
    on:load={handleImageLoad}
    class:loaded={isImageLoaded}
    src={imageSrc}
    alt=""
    role="none"
    style={`transform: ${imageTransform}`}
    crossOrigin="anonymous"
    draggable="false" />
</div>
