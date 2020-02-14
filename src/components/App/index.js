import linearScale from 'simple-linear-scale';
import styles from './styles.css';

export default function App({ dataURL, startVH, endVH } = {}) {
  startVH = Math.max(0, Math.min(100, typeof startVH === 'number' ? startVH : 100));
  endVH = Math.max(0, Math.min(100, typeof endVH === 'number' ? endVH : 100));

  const rootEl = (this.el = document.createElement('div'));

  this.el.className = styles.root;

  const imageEl = document.createElement('img');

  imageEl.className = styles.image;

  let parentBlockEl;
  let config;
  let xScale;
  let yScale;
  let zoom;

  const rootElMounted = new Promise(resolve => {
    (function check() {
      const _parentBlockEl = rootEl.closest('.Block');

      if (!_parentBlockEl) {
        return setTimeout(check, 100);
      }

      parentBlockEl = _parentBlockEl;
      resolve();
    })();
  });

  const imageReady = new Promise(resolve => {
    fetch(dataURL)
      .then(response => response.json())
      .then(data => {
        config = data;
        imageEl.crossOrigin = 'anonymous';
        imageEl.addEventListener(
          'load',
          () => {
            rootEl.appendChild(imageEl);
            resolve();
          },
          false
        );
        imageEl.addEventListener('error', err => console.error(err), false);
        imageEl.src = `${dataURL.substr(0, dataURL.lastIndexOf('/') + 1)}${config.imageURL}`;
      });
  });

  const updateFactors = () => {
    // Pick the best height for device, assuming a height difference under
    // 200px signifies a browser with variable UI height such as iOS's Safari
    const _innerHeight = window.innerHeight;
    const _availHeight = window.screen.availHeight;
    const viewportHeight = _availHeight && Math.abs(_availHeight - _innerHeight) < 200 ? _availHeight : _innerHeight;
    const viewportWidth = window.innerWidth;
    const { height } = parentBlockEl.getBoundingClientRect();
    const domain = [(startVH / 100) * viewportHeight, -height - (endVH / 100) * viewportHeight + viewportHeight];

    xScale =
      config.beginAt.x > config.endAt.x
        ? linearScale([domain[1], domain[0]], [config.endAt.x, config.beginAt.x], true)
        : linearScale(domain, [config.beginAt.x, config.endAt.x], true);
    yScale =
      config.beginAt.y > config.endAt.y
        ? linearScale([domain[1], domain[0]], [config.endAt.y, config.beginAt.y], true)
        : linearScale(domain, [config.beginAt.y, config.endAt.y], true);
    zoom = Math.max(viewportHeight / config.naturalViewport.height, viewportWidth / config.naturalViewport.width);
  };

  const updateTransform = () => {
    const { top } = parentBlockEl.getBoundingClientRect();

    imageEl.style.setProperty('transform', `scale(${zoom}) translate(${-xScale(top)}px, ${-yScale(top)}px)`);
  };

  const updateAll = () => {
    updateFactors();
    updateTransform();
  };

  Promise.all([rootElMounted, imageReady]).then(() => {
    const schedulerBasedUpdate = client => (client.hasChanged ? updateAll : updateTransform)();
    window.__ODYSSEY__.scheduler.enqueue(updateAll);
    window.__ODYSSEY__.scheduler.subscribe(schedulerBasedUpdate);

    if (module.hot) {
      module.hot.dispose(() => {
        window.__ODYSSEY__.scheduler.unsubscribe(schedulerBasedUpdate);
      });
    }
  });
}
