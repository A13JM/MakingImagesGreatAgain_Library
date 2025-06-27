document.addEventListener('DOMContentLoaded', () => {
    /***************************************************
     * Configuration & State
     ***************************************************/
    const jsonUrl = 'https://raw.githubusercontent.com/A13JM/MakingImagesGreatAgain_Library/refs/heads/main/tag_groups_and_lists_output.json';
    const CHUNK_SIZE = 50;
    const HIGHLIGHT_DURATION = 1500;
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
     * AI Explanation Modal Logic
     ***************************************************/
    const fetchExplanation = async (tag) => {
        // --- Vercel Backend Method ---
        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag: tag })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'The server returned an error.');
            }
            return data.explanation;
        } catch (error) {
            console.error('Failed to fetch explanation:', error);
            return `Error: ${error.message}`;
        }
    }; // <-- THIS IS THE MISSING BRACE!

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
                initialLoader.textContent = 'Failed to load tag data.';
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
            displayContainer.innerHTML = '<p class="text-gray-400 text-center py-5">No tag groups found.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const [key, value] of Object.entries(globalJsonData)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'bg-gray-800/60 rounded-xl border border-gray-700/80 shadow-sm overflow-hidden bg-transition';
            renderGroup(key, value, categoryDiv, true);
            fragment.appendChild(categoryDiv);
        }
        displayContainer.appendChild(fragment);
    };

    const renderGroup = (groupKey, groupValue, parentElement, isTopLevel) => {
        const groupId = `group-${standardizeName(groupKey).replace(/\s+/g, '-')}`;
        const listId = `${groupId}-list`;

        const titleButton = document.createElement('button');
        titleButton.className = `w-full flex justify-between items-center p-4 text-left font-medium ${isTopLevel ? 'text-lg text-gray-100' : 'text-base text-gray-200'} hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-t-lg bg-transition transition-colors`;
        titleButton.setAttribute('aria-expanded', 'false');
        titleButton.setAttribute('aria-controls', listId);
        titleButton.id = groupId;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = transformNameForDisplay(groupKey);
        titleButton.appendChild(titleSpan);

        const chevronIcon = document.createElement('img');
        chevronIcon.src = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/chevron-down.svg";
        chevronIcon.alt = "Expand/Collapse";
        chevronIcon.className = "w-5 h-5 transform transition-transform duration-300 text-gray-400";
        titleButton.appendChild(chevronIcon);

        const listContainer = document.createElement('div');
        listContainer.className = 'list-container border-t border-gray-700/80 bg-gray-800/60 bg-transition';
        listContainer.id = listId;
        listContainer.setAttribute('role', 'region');
        listContainer.setAttribute('aria-labelledby', groupId);

        parentElement.appendChild(titleButton);
        parentElement.appendChild(listContainer);

        const stdKey = standardizeName(groupKey);
        groupMap.set(stdKey, { titleElement: titleButton, listDiv: listContainer, value: groupValue, chevron: chevronIcon, isRendered: false });

        titleButton.addEventListener('click', () => {
            const isExpanded = listContainer.classList.contains('active');
            titleButton.setAttribute('aria-expanded', !isExpanded);
            if (!isExpanded) {
                listContainer.classList.add('active');
                chevronIcon.style.transform = 'rotate(180deg)';
                const groupInfo = groupMap.get(stdKey);
                if (groupInfo && !groupInfo.isRendered) {
                    renderGroupContent(groupKey, groupValue, listContainer);
                    groupInfo.isRendered = true;
                }
            } else {
                listContainer.classList.remove('active');
                chevronIcon.style.transform = 'rotate(0deg)';
            }
        });
    };

    const renderGroupContent = (groupKey, value, container) => {
        container.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader !w-5 !h-5"></div><span class="ml-2 text-sm text-gray-400">Loading...</span></div>`;
        setTimeout(() => {
            container.innerHTML = '';
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const subFragment = document.createDocumentFragment();
                let hasContent = false;
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (subKey.toLowerCase() === 'list_tags' && Array.isArray(subValue)) {
                        renderListItems(subValue, container);
                        hasContent = true;
                    } else {
                        const subDiv = document.createElement('div');
                        subDiv.className = 'my-2 mx-3 p-2 border border-gray-700/70 rounded-lg bg-gray-700/30';
                        renderGroup(subKey, subValue, subDiv, false);
                        subFragment.appendChild(subDiv);
                        hasContent = true;
                    }
                }
                if (subFragment.childNodes.length > 0) container.appendChild(subFragment);
                else if (!hasContent) container.innerHTML = '<p class="p-3 text-sm text-gray-500">No items in this group.</p>';
            } else if (Array.isArray(value) || typeof value === 'string') {
                renderListItems(Array.isArray(value) ? value : [value], container);
            } else {
                container.innerHTML = '<p class="p-3 text-sm text-gray-500">No items in this group.</p>';
            }
        }, 50);
    };

    const renderListItems = (items, container) => {
         if (!items || items.length === 0) {
             container.innerHTML = '<p class="p-4 text-sm text-gray-500">No items.</p>';
             return;
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
        const displayText = transformNameForDisplay(text);
        li.className = 'flex items-center justify-between gap-2 group p-2 rounded-lg hover:bg-white/5 transition-colors';

        if (groupMap.has(standardized)) {
            const linkButton = document.createElement('button');
            linkButton.textContent = displayText;
            linkButton.className = 'text-indigo-400 hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5';
            linkButton.onclick = (e) => { e.stopPropagation(); openLinkedGroup(standardized); };
            const linkIcon = document.createElement('img');
            linkIcon.src = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/link-2.svg";
            linkIcon.alt = "Link to group";
            linkIcon.className = "w-4 h-4 text-indigo-400";
            
            const container = document.createElement('div');
            container.className = 'flex items-center gap-2';
            container.appendChild(linkIcon);
            container.appendChild(linkButton);
            li.appendChild(container);

        } else {
            li.title = `Click to copy "${text}"`;
            li.classList.add('cursor-pointer');

            const tagSpan = document.createElement('span');
            tagSpan.textContent = displayText;
            tagSpan.className = 'flex-grow truncate select-none text-gray-300';
            li.appendChild(tagSpan);

            li.onclick = async (e) => {
                if (e.target.closest('button')) return;
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification(`Copied: ${displayText}`);
                    li.classList.add('copied-success');
                    setTimeout(() => { li.classList.remove('copied-success'); }, COPY_FEEDBACK_DURATION);
                } catch (err) {
                    console.error('Failed to copy:', err);
                    showNotification('Failed to copy tag.');
                }
            };

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200';
            
            const explainButton = document.createElement('button');
            explainButton.className = 'p-1.5 rounded-full text-gray-400 hover:bg-white/10 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors transform hover:scale-110';
            explainButton.title = `Explain "${text}" with AI`;
            explainButton.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/sparkles.svg" alt="Explain" class="w-5 h-5"/>`;
            explainButton.onclick = (e) => { e.stopPropagation(); showExplanationModal(text); };
            buttonGroup.appendChild(explainButton);

            const searchButton = document.createElement('button');
            searchButton.className = 'p-1.5 rounded-full text-gray-400 hover:bg-white/10 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors transform hover:scale-110';
            searchButton.title = `Search "${text}" on Danbooru`;
            searchButton.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/search.svg" alt="Search" class="w-5 h-5"/>`;
            searchButton.onclick = (e) => {
                e.stopPropagation();
                window.open(`https://danbooru.donmai.us/posts?tags=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
            };
            buttonGroup.appendChild(searchButton);
            
            li.appendChild(buttonGroup);
        }
        return li;
    };

    const renderChunkedList = (items, listElement, container) => {
        let currentIndex = 0;
        const loadMoreButton = document.createElement('button');
        loadMoreButton.className = 'mt-3 w-full text-center px-4 py-2 text-sm font-medium rounded-md text-indigo-300 bg-indigo-900/50 hover:bg-indigo-800/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800';
        loadMoreButton.textContent = `Load More (${items.length - CHUNK_SIZE} remaining)`;
        const renderChunk = () => {
            const fragment = document.createDocumentFragment();
            const nextEnd = Math.min(currentIndex + CHUNK_SIZE, items.length);
            for (let i = currentIndex; i < nextEnd; i++) {
                fragment.appendChild(createListItem(items[i]));
            }
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
        if (currentIndex < items.length) container.appendChild(loadMoreButton);
    };
                const showExplanationModal = async (tag) => {
                // Reset the explanation text to its initial hidden state
                modalExplanationElement.classList.remove('visible'); 
                modalTagElement.textContent = tag;
                
                // Show the modal
                aiExplainModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                
                // Show the loader immediately
                modalExplanationElement.innerHTML = `<div class="flex items-center justify-center p-6"><div class="loader"></div></div>`;
                // Make the loader itself visible (it won't animate, just appear)
                modalExplanationElement.classList.add('visible'); 

                // Fetch the explanation from the API
                const explanation = await fetchExplanation(tag);
                
                // Hide the loader and prepare for the new text animation
                modalExplanationElement.classList.remove('visible');
                
                // Use a tiny delay to allow the browser to register the "hidden" state before animating to "visible"
                setTimeout(() => {
                    // Put the new text in and trigger the final animation
                    modalExplanationElement.textContent = explanation;
                    modalExplanationElement.classList.add('visible');
                }, 50); // 50ms is plenty of time
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
            groupInfo.titleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            groupInfo.titleElement.parentElement.classList.remove('highlight-animation');
            void groupInfo.titleElement.parentElement.offsetWidth; // Trigger reflow
            groupInfo.titleElement.parentElement.classList.add('highlight-animation');
            setTimeout(() => {
                groupInfo.titleElement.parentElement.classList.remove('highlight-animation');
            }, HIGHLIGHT_DURATION);
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
        if (event.shiftKey && event.key.toUpperCase() === 'F') {
            event.preventDefault();
            foldAllGroups();
        }
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
            if (initialLoader) {
                initialLoader.remove();
            }
            renderAllGroups();
        } catch (error) {
            console.error("Initialization failed:", error);
            if (initialLoader && displayContainer.contains(initialLoader)) {
                initialLoader.textContent = 'Failed to initialize application.';
                initialLoader.classList.add('text-red-400');
            } else if (!displayContainer.hasChildNodes()) {
                displayContainer.innerHTML = '<p class="text-red-400 text-center py-5">Failed to initialize application.</p>';
            }
        }
    };

    initializeApp();
});
