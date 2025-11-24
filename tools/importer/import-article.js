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
const EDGEURL = 'https://main--blog--splunk-wm.aem.page'

const createMetadataBlock = (main, document, params) => {
  const hero = main.querySelector('.splunkBlogsArticle-header-Wrapper');
  if (!hero) return;

  const headTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  const headDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const heroImage = hero.querySelector('div.splunkBlogsArticle-header-hero-imageContainer img');
  const author = main.querySelector('div.splunkBlogsArticle-body-author');
  const readTime = main.querySelector('div.splunkBlogsArticle-header-readTime');
  let authorName = '';
  const authorPaths = document.createElement('div');
  if (author) {
    const authorAnchors = Array.from(author.querySelectorAll('div.splunkBlogsAuthorBadge-authorName a'));
    const names = authorAnchors.map(a => a.textContent.trim()).filter(Boolean);
    const hrefs = authorAnchors.map((a) => {
      let h = (a.getAttribute('href') || a.href || '').trim();
      if (!h) return '';
      h = `${EDGEURL}${h.replace('_', '-').replace(/\.html$/, '')}`;
      const anchor = document.createElement('a');
      anchor.href = h;
      anchor.textContent = h;
      return anchor;
    }).filter(Boolean);
    authorName = names.join(', ');
    hrefs.forEach((anchor, idx) => {
      authorPaths.append(anchor);
      if (idx < hrefs.length - 1) {
        authorPaths.append(document.createElement('br'));
      }
    });
  }

  const tags = Array.from(main.querySelectorAll('div.splunkBlogsArticle-body-tagsTagsSection a')).map(tag => tag.textContent.trim());
  const splunkMeta = params.splunkMeta || {};
  const category = splunkMeta.page.blogCategory || '';
  const blogBylineDate = splunkMeta.page.blogBylineDate || '';

  const meta = {
    Title: headTitle,
    Description: headDesc,
    Image: heroImage ? heroImage : '',
    Template: 'Article',
    Author: authorName,
    'Author URL': authorPaths,
    Tags: tags.join('\n'),
    Category: category,
    Published: blogBylineDate,
    'Read Time': readTime,
  };

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.prepend(metaBlock);
  hero.remove();
  author.remove();
};

function findKeyTakeaways(main, document) {
  const keyTakeawaysSection = document.querySelector('div.key-takeaways span.tabContent');
  if (!keyTakeawaysSection) return;
  const heading = document.createElement('h4');
  const strong = document.createElement('strong');
  strong.textContent = ':key-takeaways: Key Takeaways';
  heading.append(strong);
  const takeawaysList = keyTakeawaysSection.querySelector('ol, ul');
  const container = document.createElement('div');
  container.append(heading);
  if (takeawaysList) {
    container.append(takeawaysList);
  }
  const cells = [
    ['Key Takeaways'],
    [container]
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  keyTakeawaysSection.replaceWith(table);
}

function findBodyIframes(main, document, params) {
  if (!params.bodyIframes || params.bodyIframes.length === 0) return;
  params.bodyIframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) {
      const a = document.createElement('a');
      a.href = src;
      a.textContent = src;
      if (src.includes('embed.podcasts.apple.com') || src.includes('www.podbean.com')) {
        const cells = [
          ['Podcast'],
          [a],
        ];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        iframe.replaceWith(table);
      } else if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
        const cells = [
          ['Video'],
          [a],
        ];
        const table = WebImporter.DOMUtils.createTable(cells, document);
        iframe.replaceWith(table);
      }
    }
  });
}

// Find XF in the body of the article
function findXFs(main, document, params) {
  if (!params.bodyXFs || params.bodyXFs.length === 0) return;
  params.bodyXFs.forEach((section) => {
    const resource = section.querySelector('a.ga-cta').pathname;
    const page = resource.replace(/\.html$/, '').split('/').pop();
    const a = document.createElement('a');
    const loc = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`
    a.href = loc;
    a.textContent = loc;
    const cells = [
      ['Fragment'],
      [a],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    console.log('Replacing section:', section);
    section.replaceWith(table);
  });
}

function findVidyard(main, document) {
  const videoSections = main.querySelectorAll('.splunk-video-wrapper');
  if (videoSections.length === 0) return;
  videoSections.forEach((section) => {
    const isVidyard = section.querySelector('.vidyard-custom-video .open-yardvideo-modal');
    if (isVidyard) {
      const placeHolderImg = section.querySelector('.vidyard-custom-video img.video-thumbnail.desktop');
      const src = `https://playvidyard.com/${isVidyard.getAttribute('data-contentid')}`;
      const a = document.createElement('a');
      a.href = src;
      a.textContent = src;
      const value = document.createElement('div');
      value.append(placeHolderImg, a);
      const cells = [
        ['Video (Vidyard)'],
        [value],
        [isVidyard.getAttribute('data-video-title') || ''],
      ];
      const table = WebImporter.DOMUtils.createTable(cells, document);
      section.replaceWith(table);
    } 
  });
}

function findTables(main, document) {
  const tableSections = document.querySelectorAll('div.text table');
  if (tableSections.length === 0) return;
  tableSections.forEach((table) => {
    const cells = [];
    const hasHeader = table.querySelector('thead tr th') !== null;
    if (hasHeader) {
      cells.push(['Table']);
      // extract header row
      const headerRow = table.querySelectorAll('thead tr th');
      const headerCells = Array.from(headerRow).map(th => th.textContent.trim());
      cells.push(headerCells);
    } else {
      cells.push(['Table (no header)']);
    }
    // extract body rows
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((tr) => {
      const rowCells = Array.from(tr.querySelectorAll('td')).map(td => td.innerHTML);
      cells.push(rowCells);
    });

    const tableBlock = WebImporter.DOMUtils.createTable(cells, document);
    table.replaceWith(tableBlock);
  });
}

function findPromoCard(main, document) {
  const promoCardSections = document.querySelectorAll('.splunkBlogsArticle-body-content div.promocard > div');
  if (promoCardSections.length === 0) return;
  promoCardSections.forEach((section) => {
    const card = section.querySelector('.card');
    const settings = [...section.classList, ...card.classList].join(', ');
    let variants = '';
    const variantList = [];
    if (settings.includes('splunk-gradient')) variantList.push('gradient border');
    if (settings.includes('splunk-top-border')) variantList.push('top border');
    if (settings.includes('splunk-bottom-border')) variantList.push('bottom border');
    if (settings.includes('splunk-light-gray')) variantList.push('dark gray');
    if (settings.includes('boxShadow')) variantList.push('shadow');
    // clickable
    // image left
    // dynamic link
    // secondary link
    // light gray
    // float image right
    // float image left

    variants = [...new Set(variantList)].join(', ');
    const title = variants.length ? `Promo Card (${variants})` : 'Promo Card';
    const cells = [
      [title],
      [card],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    section.replaceWith(table);
  });
}

function findAccordion(main, document) {
  const accordionSections = document.querySelectorAll('div.accordion:has(.accordion-box-item)');
  if (accordionSections.length === 0) return;
  accordionSections.forEach((section) => {
    const container = document.createElement('div');
    const title = section.querySelector('div.accordion-title');
    const cells = [
      ['Accordion'],
    ];
    if (title) {
      container.append(title);
    }
    const cardSections = section.querySelectorAll('div.card');
    cardSections.forEach((card) => {
      const head = card.querySelector('div.card-head');
      const body = card.querySelector('div.card-body');
      const headDiv = document.createElement('div');
      const bodyDiv = document.createElement('div');
      headDiv.innerHTML = head ? head.innerHTML.trim() : '';
      bodyDiv.innerHTML = body ? body.innerHTML.trim() : '';
      cells.push([headDiv, bodyDiv]);
    });
    container.append(WebImporter.DOMUtils.createTable(cells, document));
    section.replaceWith(container);
  });
}

function findAboutSplunkXF(main, document, params) {
  if (!params.aboutXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/about-splunk`;
  a.href = loc;
  a.textContent = loc;
  addSimpleBlock('Fragment', a, main, document);
  addHR(main);
}

function findSubscriptXF(main, document, params) {
  if (!params.subscribeXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/subscribe-footer`;
  a.href = loc;
  a.textContent = loc;
  addSimpleBlock('Fragment', a, main, document);
  addHR(main);
}

function findPerspectivesXF(main, document, params) {
  if (!params.perspectivesXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/perspectives-promo`;
  a.href = loc;
  a.textContent = loc;
  addSimpleBlock('Fragment', a, main, document);
  addHR(main);
}

function addSidebar(main, document, params) {
  const exploreMore = params.articleGuide;
  const floatingCard = params.floatingCard;

  const floatingCardDiv = document.createElement('div');
  if (floatingCard) {
    const resource = floatingCard.querySelector('a.img-link.ga-cta').pathname;
    const page = resource.replace(/\.html$/, '').split('/').pop();
    const a = document.createElement('a');
    a.href = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`;
    a.textContent = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`;
    floatingCardDiv.append(a);
  }

  const exploreMoreDivs = document.createElement('div');
  if (exploreMore) {
    exploreMore.forEach((item) => {
      const headerText = item.querySelector('div.header')?.textContent.trim() || '';
      const ul = item.querySelector('ul');
      if (headerText) {
        const strong = document.createElement('strong');
        strong.textContent = headerText;
        exploreMoreDivs.append(strong);
      }
      if (ul) {
        exploreMoreDivs.append(ul.cloneNode(true));
      }
    });
  }

  const cells = [
    ['Sidebar'],
  ];
  if (exploreMoreDivs.children.length > 0) {
    cells.push([exploreMoreDivs]);
  }
  cells.push([floatingCardDiv]);

  const table = WebImporter.DOMUtils.createTable(cells, document);
  main.append(table);

  const sectionCells = [
    ['Section Metadata'],
    ['Style', 'two-column'],
  ];
  const sectionMeta = WebImporter.DOMUtils.createTable(sectionCells, document);
  main.append(sectionMeta);
}

function addRelatedArticles(main, document, params) {
  if (!params.relatedArticles || params.relatedArticles.length === 0) return;
  let articleList = '';
  const container = document.createElement('div');
  const articles = Array.from(params.relatedArticles);
  params.relatedArticles.forEach((article, idx) => {
    const path = `${EDGEURL}${article.pathname.replace('_', '-').replace(/\.html$/, '')}`;
    const a = document.createElement('a');
    a.href = path;
    a.textContent = article.textContent.trim();
    container.append(a);
    if (idx < params.relatedArticles.length - 1) {
      container.append(document.createElement('br'));
    }
  });
  articleList = container;

  const cells = [
    ['Latest Articles'],
    ['Title', 'Related Articles'],
    ['Filter', 'paths'],
    ['Paths', articleList],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  main.append(table);
}

function addSimpleBlock(type, property, main, document) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const cells = [
    [type],
  ];
  // if property is not empty string
  if (property != '') {
    cells.push([property]);
  }
  cells.forEach((rowCells, rowIndex) => {
    const row = document.createElement('tr');
    rowCells.forEach((cellContent) => {
      const cell = rowIndex === 0 ? document.createElement('th') : document.createElement('td');
      if (typeof cellContent === 'object') {
        cell.append(cellContent);
      } else {
        cell.textContent = cellContent;
      }
      row.append(cell);
    });
    if (rowIndex === 0) {
      thead.append(row);
    } else {
      table.append(row);
    }
  });
  table.append(thead, tbody);

  main.append(table);
}

function addHR(main) {
  const hr = document.createElement('hr');
  main.append(hr);
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
    params.relatedArticles = document.querySelectorAll('.latest-blogs-container .item .card .headline');
    params.articleGuide = document.querySelectorAll('.splunkBlogsArticle-body-sidebarExploreMoreSection .blogs-article-guide');
    params.floatingCard = document.querySelector('.splunkBlogsArticle-body-sidebarFloatingCardSection .cmp-experiencefragment--floating-promo-card');
    params.bodyIframes = document.querySelectorAll('div.splunkBlogsArticle-body-Wrapper iframe');
    params.aboutXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--about-splunk');
    params.subscribeXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--subscribe-footer');
    params.perspectivesXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--perspectives-promo')
    params.bodyXFs = document.querySelectorAll('.splunkBlogsArticle-body-Wrapper .splunkBlogsArticle-body-content div.experience-fragment');
    // extract splunkMeta from scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      const scriptContent = script.textContent || '';
      if (scriptContent.includes('var splunkMeta =')) {
          const jsonString = scriptContent.match(/var splunkMeta = (\{[\s\S]*?\});/)[1];
          params.splunkMeta = JSON.parse(jsonString);
      }
    });
  },
  onLoad: async ({ document, url, params }) => {
    try {
      await WebImporter.Loader.waitForElement('.splunkBlogsArticle-body-Wrapper .splunkBlogsArticle-body-content div.experience-fragment', document, 10000, 500);
    } catch (error) {
      throw new Error(`Element .wait-for-me not found in page ${params.originalURL}`);
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
      'body .globalcomponent-enabler-footer',
      'body .experience-fragment.experiencefragment',
      'body .latestblog',
      'body .d-done',
      'body .splunkBlogsArticle-body-header',
      'iframe',
      'noscript',
    ]);

    createMetadataBlock(main, document, params);
    addSidebar(main, document, params);
    addHR(main);
    addSimpleBlock('Author Bio List', '', main, document);
    addHR(main);
    addRelatedArticles(main, document, params);
    addHR(main);
    findAboutSplunkXF(main, document, params);
    findSubscriptXF(main, document, params);
    findPerspectivesXF(main, document, params);
    findBodyIframes(main, document, params);
    findKeyTakeaways(main, document);
    findXFs(main, document, params);
    findVidyard(main, document, params);
    findTables(main, document);
    findPromoCard(main, document);
    findAccordion(main, document);

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
      path,
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
        // adjust the src to be relative to the current page
        if (!img.src.includes('vidyard.com')) {
          img.src = `https://www.splunk.com${u.pathname}`;
        }
      }
    });

    return ret;
  },
};
