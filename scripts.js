// Global Variables
	let searchDebounce;

// Elements
	const saveButton = document.getElementById('saveBtn');
	const clearButton = document.getElementById('clearBtn');
	const mangaListEl = document.getElementById('mangaList');
	const searchEl = document.getElementById('search');

// Events
	document.addEventListener('DOMContentLoaded', async function() {
		await RefreshMangaList();
	}, false)

	saveButton.addEventListener('click', async () => {
		const result = await GetTabInfo();

		if (result) await ChromeStorage('set', result);
		else console.log("Cannot add manga");
	});

	clearButton.addEventListener('click', async () => {
		if (confirm("Clear EVERYTHING?")) await ChromeStorage('clear');
	});

	searchEl.addEventListener('keyup', async (e) => {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(async () => {
			const filteredManga = await SearchManga(e.target.value);
			await AssignMangaList(filteredManga);
		}, 1000);
	});

// Functionalities
	const SearchManga = async (mangaName) => {
		const mangaList = await ChromeStorage('get');

		const regexpString = mangaName.split(' ').map(i => "("+i+")").join('|');

		const result = Object.entries(mangaList)
			.filter(([_, manga]) => new RegExp(regexpString, "gi").test(manga.title))
			.map(([_, obj]) => obj);
		
		return result;
	}

	const RedirectPage = async (manga) => {
		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		await ChromeStorage('set', manga);
		await chrome.tabs.update(tab.id, { url: manga.url });
	}

	const GenerateMangaElement = (manga) => {
		const wrapper = document.createElement('tr');

		const content = document.createElement('td');
			content.className = "manga";
			content.innerText = manga.title;
			content.addEventListener('click', async () => { await RedirectPage(manga) });
		const del = document.createElement('td');
			del.className = "mangaDelete";
			del.innerText = "Delete";
			del.addEventListener('click', async () => { await ChromeStorage('delete', manga) });

		[content,del].map(e => wrapper.appendChild(e));
		mangaListEl.appendChild(wrapper);
	}

	const RefreshMangaList = async () => {
		const mangaList = await ChromeStorage('get');
		await AssignMangaList(mangaList);
	};

	const AssignMangaList = async (list) => {
		mangaListEl.innerHTML = "";
		list.map(manga => GenerateMangaElement(manga));
	};

	const ChromeStorage = async (action, data) => {
		let { mangaList } = await chrome.storage.sync.get(['mangaList']);

		if (action == 'get') {
			return Object.entries(mangaList)
				.map(([key, value]) => value)
				.sort((a, b) => { return b.timestamp - a.timestamp });
		}
		else {
			if (action == 'clear') mangaList = {}
			else if (action == 'set') mangaList[data.title] = data;
			else if (action == 'delete') delete mangaList[data.title];

			await chrome.storage.sync.set({ mangaList });
			await RefreshMangaList();
		}
	}

	const GetTabInfo = async () => {
		let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		const urlArray = tab.url.split('/');
		if (urlArray.length > 3) {
			const timestamp = + new Date();
			// Get Title Name
			let title = tab.title;
			switch (urlArray.length) {
				case 4:
					title = title.split(' Manga Online Free')[0];
				case 5:
					title = title.split(' Chapter ')[0];
			}
			return {
				title,
				url: tab.url,
				timestamp
			}
		}
		return false
	}