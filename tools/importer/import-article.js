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

/**
 * Extracts author metadata from a page's author badge and appends a metadata block
 * and (optionally) the author's bio to the provided container, then removes the
 * original badge element from the document.
 *
 * The function looks for an element with the selector `.splunkBlogsAuthorBadge`.
 * If found, it extracts:
 *  - the author's name from `h1.splunkBlogsAuthorBadge-authorName` (falls back to "Author"),
 *  - the author's image element from `img.splunkBlogsAuthorBadge-image-src`,
 *  - the author's description paragraph from `div.splunkBlogsAuthorBadge-authorDescription > p`,
 *  - a newline-separated list of social link URLs from `params.socialLinks`.
 *
 * It constructs a metadata object with keys "Template", "Author", "Image", and
 * "Social URLs", obtains a metadata block via `WebImporter.Blocks.getMetadataBlock(document, meta)`,
 * appends that block to `main`, appends the author's bio HTML (if present), and
 * finally removes the original badge element from the DOM.
 *
 * Side effects:
 *  - Appends nodes to the `main` container.
 *  - Removes the `.splunkBlogsAuthorBadge` element from the provided `document`.
 *
 * @param {HTMLElement|Node} main - Container node to which the metadata block and bio will be appended.
 * @param {Document} document - Document object used to query and manipulate DOM nodes.
 * @returns {void}
 */
const createMetadataBlock = (main, document) => {
  const hero = document.querySelector('.splunkBlogsArticle-header-Wrapper');
  if (!hero) return;
  const headTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  const headDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const heroImage = hero.querySelector('div.splunkBlogsArticle-header-hero-imageContainer img');
  const author = main.querySelector('div.splunkBlogsArticle-body-author');
  let authorName = '';
  let authorPath = '';
  if (author) {
    const authorAnchors = Array.from(author.querySelectorAll('div.splunkBlogsAuthorBadge-authorName a'));
    const names = authorAnchors.map(a => a.textContent.trim()).filter(Boolean);
    const hrefs = authorAnchors.map((a) => {
      let h = (a.getAttribute('href') || a.href || '').trim();
      if (!h) return '';
      h = `https://main--blog--splunk-wm.aem.page${h.replace('en_us', 'en-us').replace(/\.html$/, '')}`;
      return h;
    }).filter(Boolean);
    authorName = names.join(', ');
    authorPath = hrefs.join(', ');
  }
  const tags = Array.from(main.querySelectorAll('div.splunkBlogsArticle-body-tagsTagsSection a')).map(tag => tag.textContent.trim());
  // Extract category, byline date, and read time from splunkMeta with sensible fallbacks
  const category = (
    document.splunkMeta?.page?.blogCategory ||
    document.splunkMeta?.page?.category ||
    document.splunkMeta?.page?.primaryCategory ||
    document.querySelector('meta[name="article:section"]')?.getAttribute('content') ||
    document.querySelector('meta[property="article:section"]')?.getAttribute('content') ||
    ''
  );

  const blogBylineDate = (
    document.splunkMeta?.page?.blogBylineDate ||
    document.splunkMeta?.page?.publishedDate ||
    document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
    document.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
    ''
  );

  const readTime = (
    main.querySelector('div.splunkBlogsArticle-header-readTime')?.textContent.trim() ||
    (document.splunkMeta?.page?.readTime ? String(document.splunkMeta.page.readTime) : '') ||
    ''
  );

  const meta = {
    Title: headTitle,
    Description: headDesc,
    Image: heroImage,
    Template: 'Article',
    Author: authorName,
    'Author URL': authorPath,
    Tags: tags.join('\n'),
    Category: category,
    Published: blogBylineDate,
    'Read-Time': readTime,
  };

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.prepend(metaBlock);
  hero.remove();
  author.remove();
};

export default {
/**
   * Preprocess the document prior to transformation to extract empty social links into params
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   */

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
      'body .globalcomponent-enabler-footer',
      'body .experience-fragment.experiencefragment',
      'body .latestblog',
      'body .d-done',
      'body .splunkBlogsArticle-body-header',
      'iframe',
      'noscript',
    ]);

    createMetadataBlock(main, document);

    // WebImporter.rules.createMetadata(main, document);
    // WebImporter.rules.transformBackgroundImages(main, document);
    // WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // WebImporter.rules.convertIcons(main, document);

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

    // multi output import

    // first, the main content
    ret.push({
      element: main,
      path,
    });

    main.querySelectorAll('img').forEach((img) => {
      console.log(img.outerHTML);
      const { src } = img;
      if (src) {
        const u = new URL(src);
        // then, all images
        ret.push({
          from: src,
          path: u.pathname,
        });
        // adjust the src to be relative to the current page
        img.src = u.pathname;
      }
    });

    return ret;
  },
};
