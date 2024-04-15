class BlogSidekickBanner {
  constructor(id) {
    this.banner = document.createElement('div');
    this.banner.className = 'blog-sidekick-banner';
    this.banner.id = id;
    this.banner.appendChild(document.createElement('style')).textContent = `
    .blog-sidekick-banner {
      z-index: 9999998;
      position: fixed;
      width: 100%;
      bottom: 0;
      left: 0;
      font-family: Arial, sans-serif;
      font-size: 1rem;
      background-color: red;
      color: white;
      padding: 0 20px;
    }
    .blog-sidekick-banner a:any-link {
      color: white;
    }
    .blog-sidekick-banner input,
    .blog-sidekick-banner button {
      font-family: Arial, sans-serif;
      font-size: 1rem;
      background: transparent;
      color: white;
    }
    .blog-sidekick-banner input {
      outline: none;
      border: none;
      width: 400px;
      text-overflow: ellipsis;
    }
    .blog-sidekick-banner button {
      border: solid 1px white;
      border-radius: 8px;
      padding: 5px 8px;
      margin-left: 5px;
      user-selection: none;
      cursor: pointer;
    }`;
    this.bannerContent = this.banner.appendChild(document.createElement('p'));
    this.bannerContent.className = 'content';
    document.body.prepend(this.banner);
  }

  querySelector(selector) {
    return this.bannerContent.querySelector(selector);
  }

  write(content, timeout) {
    this.bannerContent.innerHTML = content;
    if (timeout) {
      this.hide(timeout);
    }
  }

  hide(timeout = 0) {
    setTimeout(() => {
      this.banner.remove();
    }, timeout * 1000);
  }
}

const generateFeed = (
  feedTitle = 'My Blog',
  feedAuthor = 'WKND',
  feedData = window.blogIndex?.data || [],
  baseURL = 'https://blog.mysite.com',
  limit = 50,
) => {
  const ns = 'http://www.w3.org/2005/Atom';
  const feedEl = document.createElementNS(ns, 'feed');
  const feedTitleEl = document.createElementNS(ns, 'title');
  const feedUpdatedEl = document.createElementNS(ns, 'updated');
  const feedAuthorEl = document.createElementNS(ns, 'author');
  const feedNameEl = document.createElementNS(ns, 'name');
  const feedIdEl = document.createElementNS(ns, 'id');

  feedTitleEl.textContent = feedTitle;
  feedUpdatedEl.textContent = new Date().toISOString();
  feedNameEl.textContent = feedAuthor;
  feedIdEl.textContent = `${baseURL}/`;

  feedEl.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:base', baseURL);
  feedEl.appendChild(feedTitleEl);
  feedEl.appendChild(feedUpdatedEl);
  feedAuthorEl.appendChild(feedNameEl);
  feedEl.appendChild(feedAuthorEl);
  feedEl.appendChild(feedIdEl);

  feedData
    .slice(0, limit - 1)
    .forEach(({
      lastModified, path, title, description,
    }) => {
      const entryEl = document.createElementNS(ns, 'entry');
      const titleEl = document.createElementNS(ns, 'title');
      const linkEl = document.createElementNS(ns, 'link');
      const nameEl = document.createElementNS(ns, 'name');
      const idEl = document.createElementNS(ns, 'id');
      const updatedEl = document.createElementNS(ns, 'updated');
      const summaryEl = document.createElementNS(ns, 'summary');

      titleEl.textContent = title;
      linkEl.setAttributeNS('', 'href', path);
      idEl.textContent = baseURL + path;
      updatedEl.textContent = new Date(Math.round(lastModified * 1000)).toISOString();
      summaryEl.textContent = description;

      entryEl.appendChild(titleEl);
      entryEl.appendChild(linkEl);
      authorEl.appendChild(nameEl);
      entryEl.appendChild(idEl);
      entryEl.appendChild(updatedEl);
      entryEl.appendChild(summaryEl);
      feedEl.appendChild(entryEl);
    });

  const ser = new XMLSerializer();
  return ser.serializeToString(feedEl);
};

const hasFeed = () => !!document.querySelector('link[type="application/xml+atom"]');

const updateFeed = async ({ detail }) => {
  const feedBanner = new BlogSidekickBanner('update-feed');
  if (!hasFeed) {
    feedBanner.write('No feed defined for this page', 5);
  }
  /* eslint-disable no-console */
  const feedUrl = document.querySelector('link[type="application/xml+atom"]')?.getAttribute('href');
  if (feedUrl && window.blogIndex) {
    const {
      connect,
      saveFile,
    } = await import(`${window.location.origin}/tools/sidekick/sharepoint.js`);
    const { owner, repo, ref } = detail.data.config;
    const feedPath = new URL(feedUrl, 'https://blog.mysite.com').pathname;
    console.log(`Updating feed ${feedPath}`);
    feedBanner.write('Please wait …');
    await connect(async () => {
      try {
        const feedXml = new Blob([generateFeed()], { type: 'application/atom+xml' });
        await saveFile(feedXml, feedPath);
        let resp = await fetch(`https://admin.hlx.page/preview/${owner}/${repo}/${ref}${feedPath}`, { method: 'POST' });
        if (!resp.ok) {
          throw new Error(`Failed to update preview for ${feedPath}`);
        }
        resp = await fetch(`https://admin.hlx.page/live/${owner}/${repo}/${ref}${feedPath}`, { method: 'POST' });
        if (!resp.ok) {
          throw new Error(`Failed to publish ${feedPath}`);
        }
        feedBanner.write(`Feed <a href="${feedUrl}" target="_blank">${feedPath}</a> updated`, 5);
      } catch (e) {
        console.error(e);
        feedBanner.write(`Failed to update feed ${feedPath}, please try again later`, 5);
      }
    });
  }
};

/* register listeners for custom events */
const sk = document.querySelector('helix-sidekick');
sk.addEventListener('custom:update-feed', updateFeed);
