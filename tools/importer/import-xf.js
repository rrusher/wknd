/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

// constant for locale
const LOCALE = 'en-us';
const EDGEURL = 'https://main--blog--splunk-wm.aem.page';

function findFloatingPromoCard(main, document) {
  const promoCard = document.querySelector('.cmp-experiencefragment--floating-promo-card .main-content');
  if (!promoCard) return;

  const pic = promoCard.querySelector('picture');
  const title = promoCard.querySelector('.tabContent > p > span')?.textContent.trim() || '';
  const txt = promoCard.querySelector('.tabContent p:nth-of-type(2)')?.textContent.trim() || '';
  const anchorEl = promoCard.querySelector('a:has(span)');

  const container = document.createElement('div');

  if (pic) container.append(pic);

  container.insertAdjacentHTML('beforeend', `<b>${title}</b>`);
  container.insertAdjacentHTML('beforeend', `<p>${txt}</p>`);
  container.append(anchorEl);

  const cells = [
    ['Floating Promo'],
    [container],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  promoCard.replaceWith(table);
}

export default {
  preprocess: ({ document, url, params }) => {
    const anchorEl = document.querySelector('.cmp-experiencefragment--floating-promo-card .main-content a:has(span)');
    if (anchorEl) {
      let href = anchorEl.getAttribute('href') || anchorEl.href;
      // Handle absolute URLs
      if (href.startsWith('http')) {
        href = new URL(href).pathname;
      }
      const slug = href.replace(/\.html$/, '').split('/').pop();
      params.newPage = `/${LOCALE}/blog/fragments/${slug}`;
    }
  },
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transform: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // define the main element: the one that will be transformed to Markdown
    const main = document.body;

    // attempt to remove non-content elements
    WebImporter.DOMUtils.remove(main, [
      'body #panel-sharer-overlay',
      'body .skipMainContent',
      'body .globalcomponent-enabler-header',
      'body .cmp-experiencefragment--sub-nav-blogs',
      'body .splunkBlogsArticle-body-header',
      'body .splunkBlogsArticle-header-Wrapper',
      'body .splunkBlogsArticle-body-content',
      'body .splunkBlogsArticle-body-author',
      'body .splunkBlogsArticle-body-sidebarExploreMoreSection',
      'body .latestblog',
      'body .splunkBlogsArticle-body-tags',
      'body .cmp-experiencefragment--disclaimer',
      'body .cmp-experiencefragment--about-splunk',
      'body .cmp-experiencefragment--subscribe-footer',
      'body .globalcomponent-enabler-footer',
      'body .d-done',
      'noscript',
      'iframe',
    ]);

    findFloatingPromoCard(main, document);

    const ret = [];

    const path = ((u) => {
      let p = new URL(u).pathname;
      if (p.endsWith('/')) {
        p = `${p}index`;
      }
      return decodeURIComponent(p)
        .toLowerCase()
        .replace(/\.html$/, '')
        .replace(/[^a-z0-9/]/gm, '-');
    })(url);

    // first, the main content
    ret.push({
      element: main,
      path: params.newPage,
    });

    main.querySelectorAll('img').forEach((img) => {
      console.log(img.outerHTML);
      const { src } = img;
      if (src) {
        const u = new URL(src);
        ret.push({
          from: src,
          path: u.pathname,
        });
        // adjust the image src to be absolute to the DAM
        if (img.src.includes('localhost:3001')) {
          img.src = `https://www.splunk.com${u.pathname}`;
        }
      }
    });

    return ret;
  },
};
