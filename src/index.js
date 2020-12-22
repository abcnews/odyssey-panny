import './polyfills';
import * as acto from '@abcnews/alternating-case-to-object';
import { decode } from '@abcnews/base-36-props';
import { getMountValue, selectMounts } from '@abcnews/mount-utils';
import App from './components/App/App.svelte';

const configs = [];

function render() {
  configs.forEach(({ rootEl, props }) => {
    rootEl.removeChild(rootEl.firstElementChild);
    new App({ target: rootEl, props });
  });
}

function init() {
  selectMounts('panny').forEach(mountEl => {
    const blockEl = mountEl.closest('.Block');

    if (!blockEl) {
      return;
    }

    const rootEl = blockEl.querySelector('.Block-media');

    if (!rootEl) {
      return;
    }

    /*
      dataURL (and optional portraitDataURL) can be defined in the page in one
      of two ways:

      1) An element with `data-odyssey-panny-{id}` and
        `data-odyssey-panny-{id}-portrait` attributes, where {id} is the ID
        prop on the #panny mount, e.g.:

          <div data-mount id="pannyIDxyz"></div>
          ...
          <div
            data-odyssey-panny-xyz="{...}/landscape/data.json"
            data-odyssey-panny-xyz-portrait="{...}/portrait/data.json"
          ></div>

      2) A Base36 encoded object with dataURL & portraitDataURL props as the
        ENCODED prop on the #panny mount, e.g.:

          <div data-mount id="pannyENCODEDhfjghfds79ygfh3rgfhjgufds0g..."></div>

    */

    const { id, encoded, start, end } = acto(getMountValue(mountEl));

    if (!id && !encoded) {
      return;
    }

    let dataURL;
    let portraitDataURL;

    if (encoded) {
      try {
        ({ dataURL, portraitDataURL } = decode(encoded));
      } catch (err) {
        return console.error(err);
      }
    } else {
      const dataAttr = `data-odyssey-panny-${id}`;
      const dataEl = document.querySelector(`[${dataAttr}]`);

      if (!dataEl) {
        return;
      }

      dataURL = dataEl.getAttribute(dataAttr);
      portraitDataURL = dataEl.getAttribute(`${dataAttr}-portrait`);
    }

    if (!dataURL) {
      return;
    }

    if (portraitDataURL && window.innerWidth / window.innerHeight <= 0.75) {
      dataURL = portraitDataURL;
    }

    mountEl.parentElement.parentElement.removeChild(mountEl.parentElement);

    configs.push({
      rootEl,
      props: {
        dataURL,
        startVH: start || 0,
        endVH: end || 0
      }
    });
  });

  render();
}

if (window.__ODYSSEY__) {
  init();
} else {
  window.addEventListener('odyssey:api', init);
}

if (process.env.NODE_ENV === 'development') {
  console.debug(`Public path: ${__webpack_public_path__}`);
}
