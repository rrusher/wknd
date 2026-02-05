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

const LOCALE = 'en-us';
const MIGRATING = 'www.splunk.com/en_us/blog';
const EDGEURL = 'https://main--blog--splunk-wm.aem.page/prod';

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

export function rewriteBlogLinks(main, document) {
  const anchors = document.querySelectorAll('a[href]');
  const oldPrefix = '/en_us/blog/';
  const newPrefix = '/prod/en-us/blog/';

  anchors.forEach((a) => {
    let href = a.getAttribute('href');

    if (href.startsWith(oldPrefix)) {
      // Replace prefix
      href = href.replace(oldPrefix, newPrefix);

      // Remove trailing .html
      href = href.replace(/\.html$/i, '');

      a.setAttribute('href', href);
    }
  });
}

function createMetadataBlock(main, document, params) {
  const hero = main.querySelector('.splunkBlogsArticle-header-Wrapper');
  if (!hero) return;

  const headTitle = (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '').replace(/\s*\|\s*Splunk$/, '');
  const headDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const heroImage = hero.querySelector('div.splunkBlogsArticle-header-hero-imageContainer img');
  const author = main.querySelector('div.splunkBlogsArticle-body-author');
  const readTime = main.querySelector('div.splunkBlogsArticle-header-readTime');
  let authorName = '';
  // const authorPaths = document.createElement('div');
  let authorPaths = [];
  if (author) {
    const authorAnchors = Array.from(author.querySelectorAll('div.splunkBlogsAuthorBadge-authorName a'));
    const names = authorAnchors.map((a) => a.textContent.trim()).filter(Boolean);

    const hrefs = authorAnchors.map((a) => {
      let h = (a.getAttribute('href') || a.href || '').trim();
      if (!h) return '';
      h = `${EDGEURL}${h.replace('_', '-').replace(/\.html$/, '')}`;
      return h;
    }).filter(Boolean).join(', ');

    authorPaths = hrefs;
    authorName = names.join(', ');
  }

  const tags = Array.from(main.querySelectorAll('div.splunkBlogsArticle-body-tagsTagsSection a')).map((tag) => tag.textContent.trim());
  const splunkMeta = params.splunkMeta || {};
  const category = splunkMeta.page.blogCategory || '';
  const blogBylineDate = splunkMeta.page.blogBylineDate || '';

  const ogImageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '';
  // Create an img element from og:image if we have a URL but no hero image
  let ogImage = null;
  if (ogImageUrl && !heroImage) {
    ogImage = document.createElement('img');
    ogImage.src = ogImageUrl;
  }

  const resolvedImage = heroImage ?? ogImage ?? '';

  const meta = {
    Title: headTitle,
    Description: headDesc,
    Image: resolvedImage,
    Template: 'Article',
    Author: authorName,
    'Author URL': authorPaths,
    Tags: Array.isArray(tags) ? tags.join('\n') : '',
    Category: category,
    Published: blogBylineDate,
    'Read Time': readTime,
    ...(heroImage === null && { 'Hide Image': true }),
  };

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.prepend(metaBlock);
  hero.remove();
  author.remove();
  const tagContainer = document.querySelector('.splunkBlogsArticle-body-tags');
  tagContainer?.remove();
}

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
    [container],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  keyTakeawaysSection.replaceWith(table);
}

function findBodyIframes(main, document) {
  const iframeEl = document.querySelectorAll('.splunkBlogsArticle-body-content p iframe, .splunkBlogsArticle-body-content section iframe, .splunkBlogsArticle-body-content li iframe');
  if (iframeEl.length === 0) return;
  iframeEl.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) {
      const a = document.createElement('a');
      a.href = src;
      a.textContent = src;
      let cells;
      if (src.includes('embed.podcasts.apple.com') || src.includes('www.podbean.com') || src.includes('fireside.fm')) {
        cells = [
          ['Audio'],
          [a],
        ];
        const playlist = iframe.querySelector('ul.player-list');
        if (playlist) playlist.remove();
      } else if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
        cells = [
          ['Video'],
          [a],
        ];
      } else if (src.includes('slideshare.net')) {
        cells = [
          ['Slideshare'],
          [a],
        ];
      } else if (src.includes('play.vidyard.com')) {
        cells = [
          ['Video (Vidyard)'],
          [a],
        ];
      } else {
        const doc = iframe.closest('object');
        let ref;
        if (doc) {
          ref = doc.getAttribute('data');
        } else {
          ref = iframe.getAttribute('src');
        }
        cells = [
          ['Embed'],
          [ref],
        ];
      }
      const table = WebImporter.DOMUtils.createTable(cells, document);
      iframe.replaceWith(table);
    }
  });
}

function findCards(main, document) {
  const decks = document.querySelectorAll('.splunkBlogsArticle-body-content .customer-generic-cards > div .carousel-inner');
  if (decks.length === 0) return;
  decks.forEach((deck) => {
    const items = deck.querySelectorAll('.item');
    let variants = '';
    const variantList = [];
    const wrapper = document.createElement('div');
    items.forEach((item) => {
      const card = item.querySelector('.card');
      const icon = card?.querySelector('img[src$=".svg"]');
      if (icon) {
        const src = icon.getAttribute('src');
        const name = src.split('/').pop().replace(/\.svg$/i, '').toLowerCase();
        icon.replaceWith(document.createTextNode(`:${name}:`));
      }
      const settings = [
        ...(item?.classList ?? []),
        ...(card?.classList ?? []),
      ].join(', ');
      if (settings.includes('cardClickable')) variantList.push('Clickable');
      if (settings.includes('splunk-white')) variantList.push('Bottom Border, Shadow');
      if (settings.includes('generic-card')) variantList.push('Bottom Border, Light Gray, Shadow');
      const link = item.querySelector('.sp-btn-borderless');
      if (link) {
        if (link.classList.contains('sp-btn-darkGray')) {
          variantList.push('Secondary Link');
        } else if (link.classList.contains('sp-btn-pink')) {
          variantList.push('Dynamic Link');
        }
      }
      wrapper.append(item);
    });
    variants = [...new Set(variantList)].join(', ');
    let title;
    if (wrapper.children.length > 1) {
      title = 'Cards';
    } else {
      title = variants.length ? `Promo Card (${variants})` : 'Promo Card';
    }
    const cells = [
      [title],
      ...[...wrapper.children].map((card) => [card]),
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    deck.parentElement.parentElement.parentElement.replaceWith(table);
  });
}

function findQuote(main, document) {
  const blockquoteEl = main.querySelectorAll('.splunkBlogsArticle-body-content blockquote');
  if (blockquoteEl.length === 0) return;
  blockquoteEl.forEach((quoteEl) => {
    const text = quoteEl.innerText.trim();
    if (!text) return;
    const wrapper = quoteEl.closest('[class*="splunk-quote"]');
    const header = wrapper ? 'Quote' : 'Quote (Simple)';

    const cells = [
      [header],
      [text],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    quoteEl.replaceWith(table);
  });
}

function findDisclaimer(main, document, params) {
  // const disclaimerXF = main.querySelectorAll('.splunkBlogsArticle-body-content .cmp-experiencefragment--disclaimer');
  const disclaimerTxt = main.querySelector('.splunkBlogsArticle-body-content .cmp-experiencefragment--disclaimer .tabContent');
  if (!disclaimerTxt) return;
  const suffix = params.fragDivider ? '-with-divider' : '';
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/disclaimer${suffix}`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [a],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  const parent = disclaimerTxt.closest('.cmp-experiencefragment--disclaimer');
  parent.parentElement.replaceWith(table);
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
    const loc = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`;
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
      const isAutoplay = isVidyard.getAttribute('data-autoplay');
      const placeHolderImg = section.querySelector('.vidyard-custom-video img.video-thumbnail.desktop');
      const src = `https://play.vidyard.com/${isVidyard.getAttribute('data-contentid')}`;
      const videoLink = document.createElement('a');
      videoLink.href = src;
      videoLink.textContent = src;
      const value = document.createElement('div');
      value.append(placeHolderImg);
      value.append(document.createElement('br'));
      if (isAutoplay) {
        const autoplayLink = document.createElement('a');
        autoplayLink.href = placeHolderImg.src;
        autoplayLink.textContent = placeHolderImg.src;
        value.append(autoplayLink);
        value.append(document.createElement('br'));
      }
      value.append(videoLink);
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

// double header
function findTables(main, document) {
  const tableSections = document.querySelectorAll('.splunkBlogsArticle-body-content div.text table');
  if (tableSections.length === 0) return;
  tableSections.forEach((table) => {
    try {
      const cells = [];
      let headerCells = table.querySelectorAll('thead th');
      const hasTheadHeader = headerCells.length > 0;
      let hasFirstRowHeader = false;
      if (!hasTheadHeader) {
        const firstRow = table.querySelector('tbody tr:first-child, tr:first-child');
        if (firstRow) {
          const thCells = firstRow.querySelectorAll('th');
          if (thCells.length > 0) {
            headerCells = thCells;
            hasFirstRowHeader = true;
          }
        }
      }

      let bodyRows;
      if (table.querySelector('tbody')) {
        bodyRows = hasFirstRowHeader
          ? table.querySelectorAll('tbody tr:not(:first-child)')
          : table.querySelectorAll('tbody tr');
      } else {
        bodyRows = hasFirstRowHeader 
          ? table.querySelectorAll('tr:not(:first-child)')
          : table.querySelectorAll('tr');
      }

      const centeredColumns = [];
      let hasNonThCell = false;

      if (bodyRows.length > 0) {
        const firstRow = bodyRows[0];
        const firstRowCells = firstRow.querySelectorAll('td, th');
        firstRowCells.forEach((cell, index) => {
          const style = cell.getAttribute('style');
          if (style && style.includes('text-align: center')) {
            centeredColumns.push(`center-col-${index}`);
          }
          if (cell.tagName.toLowerCase() !== 'th') {
            hasNonThCell = true;
          }
        });
      }

      if (hasNonThCell) {
        centeredColumns.push('no-header');
      }

      let tableMarker = 'Table';
      if (centeredColumns.length > 0) {
        tableMarker += ` (${centeredColumns.join(', ')})`;
      }

      if (headerCells.length > 0) {
        cells.push([tableMarker]);
        cells.push(Array.from(headerCells).map(th => `<b>${th.textContent.trim()}</b>`));
      } else {
        cells.push([tableMarker]);
      }

      bodyRows.forEach((tr) => {
        const rowCells = Array.from(tr.querySelectorAll('td, th'))
          .map((cell) => {
            if (cell.tagName.toLowerCase() === 'th') {
              return `<b>${cell.textContent.trim()}</b>`;
            }
            return cell.innerHTML.trim();
          });
        cells.push(rowCells);
      });

      const tableBlock = WebImporter.DOMUtils.createTable(cells, document);
      table.replaceWith(tableBlock);
    } catch (error) {
      console.warn('Failed to process table:', error, table);
    }
  });
}

function findPromoCard(main, document) {
  const promoCardSections = document.querySelectorAll('.splunkBlogsArticle-body-content div.promocard');
  if (promoCardSections.length === 0) return;
  promoCardSections.forEach((section) => {
    const firstEl = section.querySelector('div');
    const card = section.querySelector('.card');
    const cardHead = section.querySelector('.card-header');
    const settings = [
      ...(firstEl?.classList ?? []),
      ...(card?.classList ?? []),
      ...(cardHead?.classList ?? []),
    ].join(', ');
    let variants = '';
    const variantList = [];
    if (settings.includes('splunk-gradient')) variantList.push('gradient border');
    if (settings.includes('splunk-top-border')) variantList.push('top border');
    if (settings.includes('splunk-bottom-border')) variantList.push('bottom border');
    if (settings.includes('splunk-gray-light')) variantList.push('dark gray');
    if (settings.includes('boxShadow')) variantList.push('shadow');
    if (settings.includes('card-header__left')) variantList.push('image left');
    if (settings.includes('thick-border')) variantList.push('thick border');
    const link = card.querySelector('.sp-btn-borderless');
    if (link) {
      if (link.classList.contains('sp-btn-darkGray')) {
        variantList.push('secondary link');
      } else {
        variantList.push('dynamic link');
      }
      const bEl = document.createElement('b');
      bEl.append(link.cloneNode(true));
      link.replaceWith(bEl);
    }
    if (settings.includes('splunk-gray-lightest')) variantList.push('light gray');
    const cardImg = card.querySelector('img');
    const floatDir = cardImg?.style?.float;
    if (!floatDir === '') {
      variantList.push(`float image ${floatDir}`);
    }

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
    const langClass = [...snippet.classList].find((c) => c.startsWith('language-'));
    const trimmed = langClass?.replace('language-', '');
    const copyBtn = container.querySelector('.blogsContentTitle-copyButton');
    const cells = [
      ['Code Snippet'],
      ['Snippet', snippet.textContent],
    ];
    if (title) cells.push(['Title', title.textContent]);
    if (label) cells.push(['Label', label.textContent]);
    if (trimmed) cells.push(['Type', trimmed]);
    if (copyBtn) cells.push(['Show Copy Button', true]);
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
    let blockname = 'Accordion';
    if (title && title.innerText.trim().includes('FAQ')) {
      blockname = 'Accordion (FAQ)';
    }
    const cells = [
      [blockname],
    ];
    if (title) {
      container.append(title);
    }
    const cardSections = section.querySelectorAll('div.card');
    cardSections.forEach((card) => {
      const head = card.querySelector('div.card-head .card-title');
      const body = card.querySelector('div.card-body');
      const headDiv = document.createElement('div');
      const bodyDiv = document.createElement('div');
      headDiv.innerHTML = head ? `<b>${head.outerHTML.trim()}</b>` : '';
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
    [a],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  aboutXF.replaceWith(table);
  const hr = document.createElement('hr');
  table.insertAdjacentElement('afterend', hr);
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
    [a],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  subscribeXF.replaceWith(table);
  const hr = document.createElement('hr');
  table.insertAdjacentElement('afterend', hr);
}

function findPerspectivesXF(main, document) {
  const perspectivesXF = document.querySelector('div.experience-fragment > div.cmp-experiencefragment--perspectives-promo');
  if (!perspectivesXF) return;
  const a = document.createElement('a');
  const loc = `${EDGEURL}/${LOCALE}/blog/fragments/perspectives-promo`;
  a.href = loc;
  a.textContent = loc;
  const cells = [
    ['Fragment'],
    [a],
  ];
  const table = WebImporter.DOMUtils.createTable(cells, document);
  perspectivesXF.replaceWith(table);
  const hr = document.createElement('hr');
  table.insertAdjacentElement('afterend', hr);
}

function findSidebar(main, document) {
  const exploreMore = document.querySelector('.splunkBlogsArticle-body-sidebarExploreMoreSection .blogs-article-guide');
  const floatingCard = document.querySelector('.splunkBlogsArticle-body-sidebarFloatingCardSection .cmp-experiencefragment--floating-promo-card');
  const floatingList = document.querySelector('.splunkBlogsArticle-body-sidebarFloatingCardSection .cmp-experiencefragment--disclaimer');
  const floatingCardDiv = document.createElement('div');
  if (floatingCard) {
    const resource = floatingCard.querySelector('a.ga-cta');
    if (resource.href.includes('localhost')) {
      const page = resource.href.replace(/\.html$/, '').split('/').pop();
      const intLink = document.createElement('a');
      intLink.href = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`;
      intLink.textContent = `${EDGEURL}/${LOCALE}/blog/fragments/${page}`;
      floatingCardDiv.append(intLink);
    } else {
      const extLink = document.createElement('a');
      extLink.href = resource.href;
      extLink.textContent = resource.href;
      floatingCardDiv.append(extLink);
    }
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
    exploreMore.remove();
  }
  // Sometimes there is a list like exploreMore but in the floating section
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

  const sidebarCells = [
    ['Sidebar'],
  ];
  if (exploreMoreDivs.children.length > 0) {
    sidebarCells.push([exploreMoreDivs]);
  }
  if (floatListDivs.children.length > 0) {
    sidebarCells.push([floatListDivs]);
  }
  sidebarCells.push([floatingCardDiv]);

  // add the section meta to support floating sidebar
  const wrapper = document.createElement('div');
  const sidebarTable = WebImporter.DOMUtils.createTable(sidebarCells, document);
  wrapper.append(sidebarTable);
  const sectionCells = [
    ['Section Metadata'],
    ['Style', 'two-column'],
  ];
  const sectionMeta = WebImporter.DOMUtils.createTable(sectionCells, document);
  wrapper.append(sectionMeta);
  wrapper.append(document.createElement('hr'));
  // add author bio
  const authorCells = [
    ['Author Bio List'],
  ];
  const authorTable = WebImporter.DOMUtils.createTable(authorCells, document);
  wrapper.append(authorTable);
  floatingCard.replaceWith(wrapper);
  const hr = document.createElement('hr');
  authorTable.insertAdjacentElement('afterend', hr);
}

function findRelatedArticles(params, document) {
  const latestBlog = document.querySelector('.latestblog');
  const relatedArticles = document.querySelectorAll('.latest-blogs-container .item .card .headline');

  if (relatedArticles.length === 0) return;
  const category = params.originalURL.split('/blog/')[1].split('/')[0];

  const cells = [
    ['Article List (Paginated)'],
    ['Title', 'Related Articles'],
    ['Blog Limit', 3],
    ['Category', category],
    ['Sort Category Shuffle Order', true],
  ];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  latestBlog.replaceWith(table);
  const hr = document.createElement('hr');
  table.insertAdjacentElement('afterend', hr);
}

function findCenterText(main, document) {
  const centeredTxt = main.querySelectorAll('.splunkBlogsArticle-body-content p:has(> img.img-align-center) + p[style*="text-align: center"]:has(> small)');
  if (centeredTxt.length === 0) return;
  centeredTxt.forEach((txt) => {
    const cells = [
      ['Center'],
      [txt.textContent.trim()],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    txt.replaceWith(table);
  });
}

function findImagefloat(main, document) {
  const imageContainers = main.querySelectorAll('.splunkBlogsArticle-body-content p:has(> img.alignright), p:has(> img.alignleft)');
  if (imageContainers.length === 0) return;
  imageContainers.forEach((container) => {
    const img = container.querySelector('img');
    const txt = container.textContent.trim();
    const variant = img.classList.contains('alignright') ? 'Float Right' : 'Float Left';
    const cells = [
      [`Column (${variant})`],
      [img, txt],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    container.replaceWith(table);
  });
}

function findForm(main, document) {
  const formContainer = main.querySelector('.splunkBlogsArticle-body-content .splunk-flex-container > div');
  if (formContainer) {
    const isInlineForm = formContainer.querySelector('form[data-redirect="/en_us/form/the-peak-threat-hunting-framework/thanks-inline.html"]');
    const div = document.createElement('div');
    if (isInlineForm) {
      const img = formContainer.querySelector('.flex-item picture img');
      let txt = formContainer.querySelector('.tabContent');
      if (txt && txt.children.length > 1) {
        let title = txt.children[0];
        const copy = txt.children[1];
        if (title.classList.contains('splunk2-h4')) {
          const h4 = document.createElement('h4');
          h4.innerHTML = title.innerHTML;
          title = h4;
        }
        const newTxt = document.createElement('div');
        newTxt.append(title.cloneNode(true));
        newTxt.append(copy.cloneNode(true));
        txt = newTxt;
      }
      const link = document.createElement('a');
      link.href = `${EDGEURL}/${LOCALE}/blog/fragments/forms/inline-form`;
      link.textContent = `${EDGEURL}/${LOCALE}/blog/fragments/forms/inline-form`;
      if (img) div.append(img.cloneNode(true));
      if (txt) div.append(txt);
      div.append(link);
    } else {
      const form = formContainer.querySelector('form');
      if (form) {
        const action = form.getAttribute('action');
        const p = document.createElement('p');
        p.textContent = `Some other form: ${action}`;
        div.append(p);
      }
    }

    const cells = [
      ['Form Container'],
      [div],
    ];
    const table = WebImporter.DOMUtils.createTable(cells, document);
    formContainer.replaceWith(table);
  }
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
    params.fragDivider = document.querySelector('.splunkBlogsArticle-body-content .cmp-experiencefragment--disclaimer p > span.tabContent');
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
      'body > img',
      'noscript',
    ]);

    createMetadataBlock(main, document, params);
    findSidebar(main, document);
    findDisclaimer(main, document, params);
    findRelatedArticles(params, document);
    findAboutSplunkXF(main, document);
    findSubscriptXF(main, document);
    findPerspectivesXF(main, document);
    findXFs(main, document);
    findKeyTakeaways(main, document);
    findVidyard(main, document);
    findTables(main, document);
    findPromoCard(main, document);
    findAccordion(main, document);
    findSnippet(main, document);
    findCards(main, document);
    findBodyIframes(main, document);
    findCenterText(main, document);
    findImagefloat(main, document);
    findForm(main, document);
    findQuote(main, document);
    rewriteBlogLinks(main, document);

    const ret = [];

    const path = ((u) => {
      let p = new URL(u).pathname;

      if (p.endsWith('/')) {
        p = `${p}index`;
      }

      p = decodeURIComponent(p)
        .toLowerCase()
        .replace(/\.html$/, '')
        .replace(/[^a-z0-9/]/gm, '-');

      // Remove leading or trailing dashes from the *filename* portion
      const parts = p.split('/');
      const filename = parts.pop().replace(/^-+|-+$/g, '');
      parts.push(filename);

      return parts.join('/');
    })(url);

    // first, the main content
    ret.push({
      element: main,
      path,
    });

    main.querySelectorAll('img').forEach((img) => {
      console.log(img.outerHTML);
      const { src } = img;
      // if (src && (!src.startsWith('blob') || !src.startsWith('https://bat.bing.com'))) {
      if (src && !src.startsWith('blob')) {
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
