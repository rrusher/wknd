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

/**
 * Sanitizes a name for use as class name.
 * @param {string} name The unsanitized name
 * @returns {string} The class name
 */
export function toClassName(name) {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

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

function findBodyIframes(main, document) {
  const iframeEl = document.querySelectorAll('.splunkBlogsArticle-body-content iframe');
  if (iframeEl.length === 0) return;
  iframeEl.forEach((iframe) => {
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
        const playlist = iframe.querySelector('ul.player-list');
        if (playlist) playlist.remove();
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

function findCards(main, document) {
  const decks = document.querySelectorAll('.splunkBlogsArticle-body-content .customer-generic-cards > div .carousel-inner');
  if (decks.length === 0) return;
  decks.forEach((deck) => {
    const cells = [
      ['Promo Card'],
    ]
    const cards = deck.querySelectorAll('.item');
    cards.forEach((card) => {
      const wrapper = document.createElement('div');
      const imgs = card.querySelectorAll('img');
      const title = card.querySelector('.anchor-wrapper-card-title');
      const link = card.querySelector('.splunk-btn.ga-cta');
      imgs.forEach((img) => {
        wrapper.append(img)
      })
      wrapper.append(title);
      wrapper.append(link);
      cells.push([wrapper]);
    });
    const table = WebImporter.DOMUtils.createTable(cells, document);
    deck.parentElement.parentElement.parentElement.replaceWith(table);
  });
}

function findDisclaimer(main, document) {
  const disclaimerXF = document.querySelector('.splunkBlogsArticle-body-content .cmp-experiencefragment--disclaimer .tabContent');
  if (!disclaimerXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/disclaimer`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [loc],
  ]
  const table = WebImporter.DOMUtils.createTable(cells, document);
  disclaimerXF.replaceWith(table);
}

// Find XF in the body of the article
function findXFs(main, document) {
  const xfEl = document.querySelectorAll('div.splunkBlogsArticle-body-content div.experience-fragment');
  if (xfEl.length === 0) return;
  xfEl.forEach((section) => {
    const resource = section.querySelector('a.ga-cta')?.pathname;
    const title = section.querySelector('h3')?.textContent.trim();
    let page;
    if (resource) {
      page = resource.replace(/\.html$/, '').split('/').pop();
    } else {
      page = toClassName(title);
    }
      const a = document.createElement('a');
      const loc = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`
      a.href = loc;
      a.textContent = loc;
      const cells = [
        ['Fragment'],
        [a],
      ];
      const table = WebImporter.DOMUtils.createTable(cells, document);
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
  const tableSections = document.querySelectorAll('.splunkBlogsArticle-body-content div.text table');
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
    if (settings.includes('splunk-gray-light')) variantList.push('dark gray');
    if (settings.includes('boxShadow')) variantList.push('shadow');
    if (settings.includes('card-header__left')) variantList.push('image left');
    if (settings.includes('sp-btn-borderless')) {
      if (settings.includes('sp-btn-darkGray')) {
        variantList.push('secondary link');
      } else {
        variantList.push('dynamic link');
      }
    }
    if (settings.includes('splunk-gray-lightest')) variantList.push('light gray');
    const cardImg = card.querySelector('img');
    const floatDir = cardImg?.style?.float;
    if (!floatDir == '') {
      variantList.push(`float image ${floatDir}`)
    }
    // clickable - data-ctalink or data-href

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

function findSnippet(main, document) {
  const snippets = document.querySelectorAll('.splunkBlogsArticle-body-content .blogsCodeContainer');
  if (snippets.length === 0) return;
  snippets.forEach((container) => {
    const title = container.querySelector('.blogsContentTitle-title');
    const label = container.querySelector('.blogsContentTitle-label');
    const snippet = container.querySelector('.blogsCodeBody code');
    const langClass = [...snippet.classList].find(c => c.startsWith('language-'));
    const trimmed = langClass?.replace('language-', '');
    const copyBtn = container.querySelector('.blogsContentTitle-copyButton');
    const cells = [
      ['Code Snippet'],
      ['Snippet', snippet],
    ];
    if (title) cells.push('Title', title);
    if (label) cells.push('Label', label);
    if (trimmed) cells.push('Type', trimmed)
    if (title) cells.push('Show Copy Button', copyBtn);
    const table = WebImporter.DOMUtils.createTable(cells, document);
    container.replaceWith(table);
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

function findAboutSplunkXF(main, document) {
  const aboutXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--about-splunk');
  if (!aboutXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/about-splunk`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [loc],
  ]
  const table = WebImporter.DOMUtils.createTable(cells, document);
  aboutXF.replaceWith(table);
}

function findSubscriptXF(main, document) {
  const subscribeXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--subscribe-footer');
  if (!subscribeXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/subscribe-footer`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [loc],
  ]
  const table = WebImporter.DOMUtils.createTable(cells, document);
  subscribeXF.replaceWith(table);
}

function findPerspectivesXF(main, document) {
  const perspectivesXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--perspectives-promo')
  if (!perspectivesXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/perspectives-promo`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [loc],
  ]
  const table = WebImporter.DOMUtils.createTable(cells, document);
  perspectivesXF.replaceWith(table);
}

function addSidebar(main, document) {
  const exploreMore = document.querySelector('.splunkBlogsArticle-body-sidebarExploreMoreSection .blogs-article-guide');
  const floatingCard = document.querySelector('.splunkBlogsArticle-body-sidebarFloatingCardSection .cmp-experiencefragment--floating-promo-card');
  const floatingList = document.querySelector('.splunkBlogsArticle-body-sidebarFloatingCardSection .cmp-experiencefragment--disclaimer');
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
      const headerText = exploreMore.querySelector('div.header')?.textContent.trim() || '';
      const ul = exploreMore.querySelector('ul');
      if (headerText) {
        const strong = document.createElement('strong');
        strong.textContent = headerText;
        exploreMoreDivs.append(strong);
      }
      if (ul) {
        exploreMoreDivs.append(ul.cloneNode(true));
      }
  }

  const floatListDivs = document.createElement('div');
  if (floatingList) {
      const headerText = floatingList.querySelector('div.header')?.textContent.trim() || '';
      const ul = floatingList.querySelector('ul');
      if (headerText) {
        const strong = document.createElement('strong');
        strong.textContent = headerText;
        floatListDivs.append(strong);
      }
      if (ul) {
        floatListDivs.append(ul.cloneNode(true));
      }
    floatingList.remove();
  }

  const cells = [
    ['Sidebar'],
  ];
  if (exploreMoreDivs.children.length > 0) {
    cells.push([exploreMoreDivs]);
  }
  if (floatListDivs.children.length > 0) {
    cells.push([floatListDivs]);
  }
  cells.push([floatingCardDiv]);

  const wrapper = document.createElement('div');
  const table = WebImporter.DOMUtils.createTable(cells, document);
  wrapper.append(table);
  const sectionCells = [
    ['Section Metadata'],
    ['Style', 'two-column'],
  ];
  const sectionMeta = WebImporter.DOMUtils.createTable(sectionCells, document);
  wrapper.append(sectionMeta);
  wrapper.append(document.createElement('hr'));
  floatingCard.replaceWith(wrapper);
}

function findAuthors(main, document) {
  const authorsDiv = document.querySelector('.splunkBlogsArticle-body-Wrapper .splunkBlogsArticle-body-author');
  if (!authorsDiv) return;
  const cells = [
    ['Author Bio List'],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  authorsDiv.replaceWith(table);
}

function addRelatedArticles(main, document) {
  const latestBlog = document.querySelector('.latestblog');
  const relatedArticles = document.querySelectorAll('.latest-blogs-container .item .card .headline');

  if (relatedArticles.length === 0) return;
  let articleList = '';
  const container = document.createElement('div');
  relatedArticles.forEach((article, idx) => {
    const path = `${EDGEURL}${article.pathname.replace('_', '-').replace(/\.html$/, '')}`;
    const a = document.createElement('a');
    a.href = path;
    a.textContent = article.textContent.trim();
    container.append(a);
    if (idx < relatedArticles.length - 1) {
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
  latestBlog.replaceWith(table);
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
      'body .globalcomponent-enabler-footer',
      'body .d-done',
      'noscript',
    ]);

    createMetadataBlock(main, document, params);
    addSidebar(main, document, params);
    findDisclaimer(main, document);
    findAuthors(main, document);
    addRelatedArticles(main, document, params);
    findAboutSplunkXF(main, document, params);
    findSubscriptXF(main, document, params);
    findPerspectivesXF(main, document, params);
    findXFs(main, document, params);
    findBodyIframes(main, document, params);
    findKeyTakeaways(main, document);
    findVidyard(main, document, params);
    findTables(main, document);
    findPromoCard(main, document);
    findAccordion(main, document);
    findSnippet(main, document);
    findCards(main, document);

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
