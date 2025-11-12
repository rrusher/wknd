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
 * @param {Object} params - Additional parameters.
 * @param {Iterable<HTMLAnchorElement>|Array<HTMLAnchorElement>|NodeList} [params.socialLinks=[]]
 *        Collection of anchor elements representing social links. Their `href` values
 *        will be joined with newline characters to form the "Social URLs" metadata field.
 * @returns {void}
 */
const createMetadataBlock = (main, document, params) => {
  const hero = document.querySelector('.splunkBlogsArticle-header-Wrapper');
  if (!hero) return;
  const headTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  const headDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const heroImage = hero.querySelector('splunkBlogsArticle-header-hero-imageContainer img').src;
  const author = main.querySelector('div.splunkBlogsAuthorBadge a');
  const authorPath = author.querySelector('div.splunkBlogsAuthorBadge-authorName a')?.href || '';
  const authorName = author.querySelector('div.splunkBlogsAuthorBadge-authorName a')?.textContent.trim();
  const tags = Array.from(main.querySelectorAll('div.splunkBlogsArticle-body-tagsTagsSection a')).map(tag => tag.textContent.trim());
  const category = document.splunkMeta?.page?.blogCategory || '';
  const blogBylineDate = document.splunkMeta?.page?.blogBylineDate || '';
  const readTime = main.querySelector('div.splunkBlogsArticle-header-readTime')?.textContent.trim() || '';

  if (authorImage && authorImage.src.includes('localhost')) {
    authorImage.src = authorImage.src.replace('localhost', 'www.splunk.com');
    authorImage.src = authorImage.src.replace(':3001', '');
  }

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
  main.append(metaBlock);
  hero.remove();
};

/**
 * Generates and appends an "Article List" configuration table for an author page.
 *
 * The author page path is derived from the provided URL by:
 *   - taking the URL's pathname,
 *   - replacing the locale segment "en_us" with "en-us",
 *   - removing a trailing ".html" if present,
 *   - and prefixing the result with the AEM base host
 *     "https://main--blog--splunk-wm.aem.page".
 *
 * The function builds a table represented by a 2D array of cells containing:
 *   - "Article List" (header)
 *   - "Dispaly Mode" set to "Paginated" (note: the table label contains a typo "Dispaly")
 *   - "Filter" set to "Author"
 *   - "Author URL" containing an anchor (<a>) to the derived author path
 *   - "Limit" set to 9
 *
 * The table DOM is created via WebImporter.DOMUtils.createTable(cells, document) and appended to the provided `main` node.
 *
 * @param {Element|DocumentFragment} main - DOM node to which the generated table will be appended. Must support `append`.
 * @param {string} url - Source URL used to derive the author page path; expected to be a valid URL string or a string parsable by the URL constructor.
 * @returns {void} Appends the generated table to `main`; no value is returned.
 * @throws {TypeError} If `url` is not a string or cannot be parsed as a URL, or if `main` does not support DOM append.
 * @see {WebImporter.DOMUtils.createTable}
 */
function addAuthorArticles(main, url) {
  const authorPath = `https://main--blog--splunk-wm.aem.page${new URL(url).pathname.replace('en_us', 'en-us').replace(/\.html$/, '')}`;
  const cells = [
    ['Article List'],
    ['Display Mode', 'Paginated'],
    ['Filter', 'Author'],
    ['Author URL', `<a href="${authorPath}">${authorPath}</a>`],
    ['Limit', 6],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  main.append(table);
}

export default {
  /**
   * Preprocess the document prior to transformation to extract empty social links into params
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   */
  preprocess: ({ document, params }) => {
    const socialLinks = document.querySelectorAll('a.socialIcon-');
    params.socialLinks = socialLinks;
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
      'body .sub-nav',
      'body .latestblog',
      'body .d-done',
      'iframe',
      'noscript',
    ]);

    // execute the custom transformations
    createMetadataBlock(main, document, params);
    // addAuthorArticles(main, url);

    // Commented out unused default rules
    // WebImporter.rules.createMetadata(main, document);
    // WebImporter.rules.transformBackgroundImages(main, document);
    // WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
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
