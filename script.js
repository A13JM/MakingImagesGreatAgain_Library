
document.addEventListener('DOMContentLoaded', () => {
    /***************************************************
     * Configuration & State
     ***************************************************/
    const jsonUrl = 'https://raw.githubusercontent.com/A13JM/MakingImagesGreatAgain_Library/refs/heads/main/tag_groups_and_lists_output.json';
    const CHUNK_SIZE = 50;
    const NOTIFICATION_DURATION = 2500;
    const COPY_FEEDBACK_DURATION = 500;

    // DOM Elements
    const displayContainer = document.getElementById('json-display');
    const initialLoader = document.getElementById('initial-loader');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const underscoreToggle = document.getElementById('underscoreToggle');
    const foldAllButton = document.getElementById('foldAllButton');
    const notificationElement = document.getElementById('notification');
    const aiExplainModal = document.getElementById('aiExplainModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalCloseButton = document.getElementById('modalCloseButton');
    const modalTagElement = document.getElementById('modalTag');
    const modalExplanationElement = document.getElementById('modalExplanation');

    // Global State
    let displayUnderscores = true;
    const groupMap = new Map();
    let globalJsonData = null;
    let notificationTimeout = null;

    /***************************************************
     * Icon Creation
     ***************************************************/
    const createGoogleSparkleIcon = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'gemini-icon-wrapper pointer-events-none'; 
        wrapper.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="gem-secondary-sparkle" d="M3.75 9.75L5.25 6.75L8.25 5.25L5.25 3.75L3.75 0.75L2.25 3.75L-0.75 5.25L2.25 6.75L3.75 9.75Z" transform="translate(4, 3)"/>
                <path class="gem-secondary-sparkle" d="M3 6L4 4L6 3L4 2L3 0L2 2L0 3L2 4L3 6Z" transform="translate(15, 15)"/>
                <path class="gem-secondary-sparkle" d="M3 6L4 4L6 3L4 2L3 0L2 2L0 3L2 4L3 6Z" transform="translate(1, 15)"/>
                <path class="gem-main-sparkle" d="M12 18L14.25 12.75L19.5 10.5L14.25 8.25L12 3L9.75 8.25L4.5 10.5L9.75 12.75L12 18Z"/>
            </svg>
        `;
        return wrapper;
    };
    
    /***************************************************
     * Utility Functions
     ***************************************************/
    const standardizeName = (name) => name ? name.toLowerCase().replace(/_/g, ' ').trim() : '';
    const transformNameForDisplay = (name) => !name ? '' : (displayUnderscores ? name : name.replace(/_/g, ' '));

    const showNotification = (message) => {
        clearTimeout(notificationTimeout);
        notificationElement.textContent = message;
        notificationElement.classList.remove('opacity-0', 'translate-y-2');
        notificationElement.classList.add('opacity-100', 'translate-y-0');

        notificationTimeout = setTimeout(() => {
            notificationElement.classList.remove('opacity-100', 'translate-y-0');
            notificationElement.classList.add('opacity-0', 'translate-y-2');
        }, NOTIFICATION_DURATION);
    };

    const toggleSettingsPanel = () => {
        const isHidden = settingsPanel.classList.contains('hidden');
        settingsPanel.classList.toggle('hidden');
        settingsButton.setAttribute('aria-expanded', !isHidden);
        if (!isHidden) settingsPanel.focus();
    };
    
    const loadSettings = () => {
        const savedUnderscores = localStorage.getItem('displayUnderscores');
        displayUnderscores = savedUnderscores === null ? true : (savedUnderscores === 'true');
        underscoreToggle.checked = displayUnderscores;
        localStorage.setItem('displayUnderscores', displayUnderscores);
    };

    /***************************************************
     * Data Fetching and Filtering
     ***************************************************/
    const fetchJsonData = async () => {
        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            showNotification(`Error loading tags: ${error.message}`);
            if (initialLoader) {
                initialLoader.textContent = 'Failed to load tag data. Please try again later.';
                initialLoader.classList.add('text-red-400');
            }
            throw error;
        }
    };

    const filterData = (data) => {
        const tagGroupStr = 'tag groups';
        if (Array.isArray(data)) {
            const filteredArray = data.map(item => filterData(item)).filter(item => item !== null && standardizeName(String(item)) !== tagGroupStr);
            return filteredArray.length > 0 ? filteredArray : null;
        } else if (typeof data === 'object' && data !== null) {
            const filteredObject = {};
            for (const [key, value] of Object.entries(data)) {
                if (standardizeName(key) === tagGroupStr) continue;
                const filteredValue = filterData(value);
                if (filteredValue !== null) filteredObject[key] = filteredValue;
            }
            return Object.keys(filteredObject).length > 0 ? filteredObject : null;
        } else if (typeof data === 'string') {
            return standardizeName(data) === tagGroupStr ? null : data;
        }
        return data;
    };

    /***************************************************
     * Rendering Functions
     ***************************************************/
    const renderAllGroups = () => {
        displayContainer.innerHTML = '';
        groupMap.clear();
        if (!globalJsonData || Object.keys(globalJsonData).length === 0) {
            displayContainer.innerHTML = '<p class="text-secondary text-center py-5">No tag groups found.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        const sortedEntries = Object.entries(globalJsonData).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [key, value] of sortedEntries) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'group-card';
            renderGroup(key, value, categoryDiv, true);
            fragment.appendChild(categoryDiv);
        }
        displayContainer.appendChild(fragment);
    };
    
    const renderGroup = (groupKey, groupValue, parentElement, isTopLevel) => {
        const stdKey = standardizeName(groupKey);

        const titleButton = document.createElement('button');
        titleButton.className = 'group-title';
        titleButton.setAttribute('aria-expanded', 'false');
        titleButton.innerHTML = `
            <span class="${isTopLevel ? '' : 'text-base text-slate-300'}">${transformNameForDisplay(groupKey)}</span>
            <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/chevron-down.svg" alt="Expand" class="w-5 h-5 text-secondary chevron-icon"/>
        `;

        const listContainer = document.createElement('div');
        listContainer.className = 'list-container';

        parentElement.appendChild(titleButton);
        parentElement.appendChild(listContainer);

        groupMap.set(stdKey, { titleElement: titleButton, listDiv: listContainer, value: groupValue, isRendered: false });

        titleButton.addEventListener('click', () => {
            const isExpanded = listContainer.classList.contains('active');
            titleButton.setAttribute('aria-expanded', String(!isExpanded));
            listContainer.classList.toggle('active');
            
            const groupInfo = groupMap.get(stdKey);
            if (!isExpanded && groupInfo && !groupInfo.isRendered) {
                renderGroupContent(groupInfo.value, listContainer);
                groupInfo.isRendered = true;
            }
        });
    };

    const renderGroupContent = (value, container) => {
        container.innerHTML = `<div class="p-4"><div class="loader mx-auto"></div></div>`;
        setTimeout(() => {
            container.innerHTML = '';
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const subFragment = document.createDocumentFragment();
                let hasContent = false;
                const sortedEntries = Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]));
                for (const [subKey, subValue] of sortedEntries) {
                    if (subKey.toLowerCase() === 'list_tags' && Array.isArray(subValue)) {
                        renderListItems(subValue, container); hasContent = true;
                    } else {
                        const subDiv = document.createElement('div');
                        subDiv.className = 'nested-group';
                        renderGroup(subKey, subValue, subDiv, false);
                        subFragment.appendChild(subDiv); hasContent = true;
                    }
                }
                if (subFragment.childNodes.length > 0) container.appendChild(subFragment);
                else if (!hasContent) container.innerHTML = '<p class="text-secondary text-center p-4">No items in this group.</p>';
            } else if (Array.isArray(value) || typeof value === 'string') {
                renderListItems(Array.isArray(value) ? value : [value], container);
            } else {
                container.innerHTML = '<p class="text-secondary text-center p-4">No items in this group.</p>';
            }
        }, 50);
    };
    
    const renderListItems = (items, container) => {
        if (!items || items.length === 0) {
            container.innerHTML = '<p class="text-secondary text-center p-4">No items.</p>'; return;
        }
        const listElement = document.createElement('ul');
        listElement.className = 'p-2';
        container.appendChild(listElement);

        if (items.length > CHUNK_SIZE) {
            renderChunkedList(items, listElement, container);
        } else {
            const fragment = document.createDocumentFragment();
            items.forEach(item => fragment.appendChild(createListItem(item)));
            listElement.appendChild(fragment);
        }
    };
    
    const createListItem = (text) => {
        const li = document.createElement('li');
        const standardized = standardizeName(text);
        li.className = 'list-item group';

        if (groupMap.has(standardized)) {
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/link-2.svg" alt="Link" class="w-4 h-4 text-accent-light">
                    <button class="text-accent-light hover:text-accent hover:underline" data-link-name="${standardized}">${transformNameForDisplay(text)}</button>
                </div>
            `;
        } else {
            li.classList.add('cursor-pointer');
            li.title = `Click to copy "${text}"`;
            
            const tagSpan = document.createElement('span');
            tagSpan.className = 'flex-grow truncate select-none text-primary';
            tagSpan.textContent = transformNameForDisplay(text);
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'action-buttons flex items-center gap-1';

            const explainButton = document.createElement('button');
            explainButton.className = 'button-icon-secondary';
            explainButton.title = `Explain "${text}" with AI`;
            explainButton.appendChild(createGoogleSparkleIcon());
            explainButton.onclick = (e) => { e.stopPropagation(); showExplanationModal(text); };
            
            const searchButton = document.createElement('button');
            searchButton.className = 'button-icon-secondary';
            searchButton.title = `Search "${text}" on Danbooru`;
            searchButton.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/search.svg" alt="Search" class="w-5 h-5"/>`;
            searchButton.onclick = (e) => {
                e.stopPropagation();
                window.open(`https://danbooru.donmai.us/posts?tags=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            };

            buttonGroup.appendChild(explainButton);
            buttonGroup.appendChild(searchButton);
            
            li.appendChild(tagSpan);
            li.appendChild(buttonGroup);

            li.addEventListener('click', async (e) => {
                if (e.target.closest('button')) return;
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification(`Copied: ${transformNameForDisplay(text)}`);
                    li.classList.add('copied-success');
                    setTimeout(() => { li.classList.remove('copied-success'); }, COPY_FEEDBACK_DURATION);
                } catch (err) { showNotification('Failed to copy tag.'); }
            });
        }
        return li;
    };

    displayContainer.addEventListener('click', (e) => {
        if (e.target.dataset.linkName) {
            e.stopPropagation();
            openLinkedGroup(e.target.dataset.linkName);
        }
    });

    const renderChunkedList = (items, listElement, container) => {
        let currentIndex = 0;
        const loadMoreButton = document.createElement('button');
        loadMoreButton.className = 'button-load-more';
        const renderChunk = () => {
            const fragment = document.createDocumentFragment();
            const nextEnd = Math.min(currentIndex + CHUNK_SIZE, items.length);
            for (let i = currentIndex; i < nextEnd; i++) fragment.appendChild(createListItem(items[i]));
            listElement.appendChild(fragment);
            currentIndex = nextEnd;
            if (currentIndex >= items.length) {
                loadMoreButton.remove();
            } else {
                loadMoreButton.textContent = `Load More (${items.length - currentIndex} remaining)`;
            }
        };
        loadMoreButton.onclick = renderChunk;
        renderChunk();
        if (currentIndex < items.length) {
            container.appendChild(loadMoreButton);
            loadMoreButton.textContent = `Load More (${items.length - CHUNK_SIZE} remaining)`;
        }
    };
    
    /***************************************************
     * AI Explanation Modal Logic
     ***************************************************/
    const fetchExplanation = async (tag) => {
        try {
            const response = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: tag }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'The server returned an error.');
            return data.explanation;
        } catch (error) {
            console.error('Failed to fetch explanation:', error);
            return `Error: ${error.message}`;
        }
    };
    
    const showExplanationModal = async (tag) => {
        modalTagElement.textContent = tag;
        modalExplanationElement.classList.remove('visible');
        modalExplanationElement.textContent = ''; 
        
        const headerIcon = aiExplainModal.querySelector('.gemini-icon-wrapper');
        headerIcon.classList.add('loading');

        aiExplainModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const explanation = await fetchExplanation(tag);
        
        headerIcon.classList.remove('loading');
        modalExplanationElement.textContent = explanation;
        modalExplanationElement.classList.add('visible');
    };

    const hideExplanationModal = () => {
        aiExplainModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    /***************************************************
     * Navigation & Interaction
     ***************************************************/
    const openLinkedGroup = (stdName) => {
        const groupInfo = groupMap.get(stdName);
        if (!groupInfo) return;
        if (!groupInfo.listDiv.classList.contains('active')) {
            groupInfo.titleElement.click();
        }
        setTimeout(() => {
            const parentContainer = groupInfo.titleElement.parentElement;
            parentContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const foldAllGroups = () => {
        let foldedCount = 0;
        groupMap.forEach(groupInfo => {
            if (groupInfo.listDiv.classList.contains('active')) {
                groupInfo.titleElement.click();
                foldedCount++;
            }
        });
        if (foldedCount > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showNotification(`Folded ${foldedCount} group(s).`);
        } else {
             showNotification('All groups are already folded.');
        }
        settingsPanel.classList.add('hidden');
        settingsButton.setAttribute('aria-expanded', 'false');
    };

    /***************************************************
     * Event Listeners
     ***************************************************/
    settingsButton.addEventListener('click', toggleSettingsPanel);
    document.addEventListener('click', (event) => {
        if (!settingsPanel.classList.contains('hidden') && !settingsPanel.contains(event.target) && !settingsButton.contains(event.target)) {
            toggleSettingsPanel();
        }
    });
    underscoreToggle.addEventListener('change', () => {
        displayUnderscores = underscoreToggle.checked;
        localStorage.setItem('displayUnderscores', displayUnderscores);
        renderAllGroups();
        settingsPanel.classList.add('hidden');
        settingsButton.setAttribute('aria-expanded', 'false');
    });
    foldAllButton.addEventListener('click', foldAllGroups);

    document.addEventListener('keydown', (event) => {
        if (event.shiftKey && event.key.toUpperCase() === 'F') { event.preventDefault(); foldAllGroups(); }
        if (event.key === 'Escape') {
            if (!settingsPanel.classList.contains('hidden')) toggleSettingsPanel();
            if (!aiExplainModal.classList.contains('hidden')) hideExplanationModal();
        }
    });

    modalCloseButton.addEventListener('click', hideExplanationModal);
    modalOverlay.addEventListener('click', hideExplanationModal);

    /***************************************************
     * Initialization
     ***************************************************/
    const initializeApp = async () => {
        loadSettings();
        try {
            const rawData = await fetchJsonData();
            globalJsonData = filterData(rawData) || {};
            if (initialLoader) initialLoader.remove();
            renderAllGroups();
        } catch (error) {
            console.error("Initialization failed:", error);
            if (initialLoader && displayContainer.contains(initialLoader)) {
                 initialLoader.textContent = 'Failed to initialize application.';
                 initialLoader.classList.add('text-red-400');
            }
        }
    };

    initializeApp();
});
