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

const createMetadataBlock = (main, document) => {
  const badge = document.querySelector('.splunkBlogsAuthorBadge');
  if (!badge) return;

  const authorName = badge.querySelector('h1.splunkBlogsAuthorBadge-authorName')?.textContent.trim() || 'Author';
  const authorImage = badge.querySelector('img.splunkBlogsAuthorBadge-image-src');
  const authorDescHTML = badge.querySelector('div.splunkBlogsAuthorBadge-authorDescription > p').innerHTML.trim() || '';
  const socialLinks = badge.querySelectorAll('div.splunkBlogsAuthorBadge-socialIcons > div');

  const meta = {
    Template: 'Author',
    Author: authorName,
    Image: authorImage,
  };

  const socialUrls = [];

  socialLinks.forEach((link) => {
    socialUrls.push(link.textContent);
  });

  if (socialUrls.length > 0) {
    meta['Social URLs'] = socialUrls.join('\n');
  }

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(metaBlock);
  if (authorDescHTML) {
    const bioWrapper = document.createElement('div');
    bioWrapper.innerHTML = authorDescHTML;
    main.append(bioWrapper);
  }
  badge.remove();
};

function addAuthorArticles(main, url) {
  const authorPath = `https://main--blog--splunk-wm.hlx.page${new URL(url).pathname.replace(/\.html$/, '').replace('en_us', 'en-us')}`;
  const cells = [
    ['Article List'],
    ['Dispaly Mode', 'Paginated'],
    ['Filter', 'Author'],
    ['Author URL', `<a href="${authorPath}">${authorPath} </a>`],
    ['Limit', 9],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  main.append(table);
}

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transformDOM: ({
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
      'body .globalcomponent-enabler-footer',
      'body .experience-fragment.experiencefragment',
      'body .latestblog',
      'body .d-done',
      'iframe',
      'noscript',
    ]);

    createMetadataBlock(main, document);
    addAuthorArticles(main, url);

    // WebImporter.rules.createMetadata(main, document);
    // WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // WebImporter.rules.convertIcons(main, document);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
  generateDocumentPath: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    let p = new URL(url).pathname;
    if (p.endsWith('/')) {
      p = `${p}index`;
    }
    return decodeURIComponent(p)
      .toLowerCase()
      .replace(/\.html$/, '')
      .replace(/[^a-z0-9/]/gm, '-');
  },
};