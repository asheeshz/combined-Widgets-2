/* ==========================================================================
   Combined JavaScript for Blogger Widgets
   ========================================================================== */

// ==========================================================================
// Stylish TOC JavaScript for Blogger (v1.1 - Prefixed with stoc-, Excludes Button Title)
// ==========================================================================
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // --- एलिमेंट चयन (stoc- प्रीफिक्स के साथ) ---
        const tocButtonWrapper = document.getElementById('stoc-toc-button-wrapper');
        const tocButtonHeader = document.getElementById('stoc-toc-button-header');
        const tocButtonScrollbox = document.getElementById('stoc-toc-button-scrollbox');
        const tocButtonList = document.getElementById('stoc-toc-button-list');
        const buttonScrollIndicator = document.getElementById('stoc-button-scroll-indicator');
        const floatingTocIcon = document.getElementById('stoc-floating-toc-icon');
        const tocSidebar = document.getElementById('stoc-toc-icon-sidebar');
        const tocSidebarInternalClose = document.getElementById('stoc-toc-sidebar-internal-close');
        const tocSidebarExternalClose = document.getElementById('stoc-toc-sidebar-external-close');
        const tocSidebarList = document.getElementById('stoc-toc-icon-sidebar-list');
        const tocSidebarScrollbox = document.getElementById('stoc-toc-icon-sidebar-scrollbox');
        const sidebarScrollIndicator = document.getElementById('stoc-sidebar-scroll-indicator');

        // --- ब्लॉगर पोस्ट कंटेंट एरिया का चयन ---
        // !!! महत्वपूर्ण: अपनी थीम के अनुसार सही सेलेक्टर डालें !!!
        const postContentArea = document.querySelector('post-body post-content'); // <-- आपकी थीम के अनुसार एडजस्ट करें! '.post-body' या अन्य

        // --- राज्य चर ---
        let currentlyHighlightedElements = [];
        let highlightTimeout = null;
        let tocButtonObserver = null;
        let hasHeadings = false;

        // --- कॉन्फ़िगरेशन ---
        const headingIcons = {
            2: 'fas fa-layer-group', 3: 'fas fa-stream', 4: 'fas fa-circle-dot',
            5: 'fas fa-minus', 6: 'fas fa-chevron-right'
        };
        const scrollOffset = 70; // Adjust based on your fixed header height
        const highlightDurationFallback = 6000; // ms
        const clickEffectDuration = 400; // ms

        // --- प्रारंभिक जांच ---
        if (!tocButtonList || !tocSidebarList || !postContentArea || !tocButtonWrapper || !floatingTocIcon || !tocSidebar) {
            console.warn("Stylish TOC Error: आवश्यक TOC तत्व या पोस्ट कंटेंट एरिया नहीं मिला। कृपया JavaScript में 'postContentArea' सेलेक्टर जांचें। वर्तमान में सेट है:", postContentArea ? postContentArea.tagName + (postContentArea.className ? '.' + postContentArea.className.split(' ').join('.') : '') + (postContentArea.id ? '#' + postContentArea.id : '') : "नहीं मिला");
            if (tocButtonWrapper) tocButtonWrapper.style.display = 'none';
            if (floatingTocIcon) floatingTocIcon.style.display = 'none';
            return;
        }

        // --- हेडिंग्स से TOC बनाएं ---
        // H3 को चुनें लेकिन #stoc-toc-button-header-title ID वाले H3 को अनदेखा करें
        const headings = postContentArea.querySelectorAll('h2, h3:not(#stoc-toc-button-header-title), h4, h5, h6'); // <<<--- यहाँ परिवर्तन है
        const fragmentButton = document.createDocumentFragment();
        const fragmentSidebar = document.createDocumentFragment();

        headings.forEach((heading) => {
            // Skip empty headings
            if (!heading.textContent?.trim()) {
                return;
            }

            // Skip headings within the TOC button itself (double check, though :not should handle it)
            if (heading.closest('#stoc-toc-button-wrapper')) {
                 console.log("Skipping heading inside button wrapper:", heading); // डिबगिंग के लिए
                 return;
            }


            hasHeadings = true;
            let id = heading.id;

            // Generate unique ID if missing
            if (!id) {
                id = 'stoc_' + (heading.textContent || 'heading').trim().toLowerCase()
                       .replace(/[^\w\s-]/g, '') // Remove non-word chars except space/hyphen
                       .replace(/\s+/g, '-') // Replace spaces with hyphens
                       .replace(/-+/g, '-'); // Replace multiple hyphens with single

                // Ensure uniqueness
                let counter = 1;
                let originalId = id;
                while (document.getElementById(id)) {
                    id = `${originalId}-${counter}`;
                    counter++;
                }
                heading.id = id; // Assign the generated ID back to the heading
            }

            const level = parseInt(heading.tagName.substring(1));
            const linkText = heading.textContent.trim();
            const iconClass = headingIcons[level] || 'fas fa-circle'; // Default icon

            // Create list items for both TOCs
            [fragmentButton, fragmentSidebar].forEach(fragment => {
                const listItem = document.createElement('li');
                listItem.className = `stoc-toc-list-item level-${level}`;

                const link = document.createElement('a');
                link.href = `#${id}`;
                link.dataset.targetId = id; // Store target ID for easy retrieval

                const iconSpan = document.createElement('span');
                iconSpan.className = 'stoc-toc-item-icon';
                iconSpan.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;

                const textSpan = document.createElement('span');
                textSpan.className = 'stoc-toc-item-text';
                textSpan.textContent = linkText;

                link.appendChild(iconSpan);
                link.appendChild(textSpan);
                listItem.appendChild(link);
                fragment.appendChild(listItem);
            });
        });

        // Append generated TOCs to the respective lists
        tocButtonList.appendChild(fragmentButton);
        tocSidebarList.appendChild(fragmentSidebar);

        // Hide TOCs if no valid headings were found
        if (!hasHeadings) {
            console.warn("Stylish TOC: पोस्ट में कोई H2-H6 हेडिंग नहीं मिली (बटन हेडर को छोड़कर)। TOC छिपाया जा रहा है।");
            if (tocButtonWrapper) tocButtonWrapper.style.display = 'none';
            if (floatingTocIcon) floatingTocIcon.style.display = 'none';
        } else {
            // Initialize visibility checks and observers only if headings exist
            checkScrollIndicatorVisibility(tocButtonScrollbox, buttonScrollIndicator);
            checkScrollIndicatorVisibility(tocSidebarScrollbox, sidebarScrollIndicator);
            setupTocButtonObserver();
            setInitialButtonTocState();
        }

        // --- बटन TOC कार्यक्षमता ---
        function toggleButtonToc() {
            const isCollapsed = tocButtonWrapper.classList.toggle('collapsed');
            tocButtonWrapper.classList.toggle('expanded', !isCollapsed);
            tocButtonHeader.setAttribute('aria-expanded', String(!isCollapsed));
            if (!isCollapsed) {
                setTimeout(() => checkScrollIndicatorVisibility(tocButtonScrollbox, buttonScrollIndicator), 50);
                tocButtonScrollbox.focus();
            } else {
                tocButtonHeader.focus();
            }
        }

        function setInitialButtonTocState() {
            tocButtonWrapper.classList.add('collapsed');
            tocButtonWrapper.classList.remove('expanded');
            tocButtonHeader.setAttribute('aria-expanded', 'false');
            if(buttonScrollIndicator) buttonScrollIndicator.classList.remove('visible');
        }

        if (tocButtonHeader) {
            tocButtonHeader.addEventListener('click', toggleButtonToc);
            tocButtonHeader.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleButtonToc();
                }
            });
        }

        // --- फ्लोटिंग आइकन दृश्यता (Intersection Observer) ---
        function setupTocButtonObserver() {
            if (!('IntersectionObserver' in window)) {
                console.warn("IntersectionObserver समर्थित नहीं है। फ्लोटिंग TOC आइकन हमेशा दिख सकता है (यदि हेडिंग्स हैं)।");
                 if(floatingTocIcon && hasHeadings) floatingTocIcon.classList.add('visible');
                return;
            }

            const observerOptions = { root: null, rootMargin: '0px', threshold: 0 };

            tocButtonObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting && !tocSidebar.classList.contains('visible')) {
                         if(floatingTocIcon) floatingTocIcon.classList.add('visible');
                    } else {
                         if(floatingTocIcon) floatingTocIcon.classList.remove('visible');
                    }
                });
            }, observerOptions);

            tocButtonObserver.observe(tocButtonWrapper);
        }

        // --- साइडबार TOC कार्यक्षमता ---
        function openSidebar() {
            tocSidebar.classList.add('visible');
            tocSidebar.setAttribute('aria-hidden', 'false');
            document.body.classList.add('stoc-toc-sidebar-open');
            if(tocSidebarExternalClose) tocSidebarExternalClose.classList.add('visible');
             if(floatingTocIcon) floatingTocIcon.classList.remove('visible');

            checkScrollIndicatorVisibility(tocSidebarScrollbox, sidebarScrollIndicator);
            setTimeout(() => tocSidebarInternalClose?.focus(), 50);

             setTimeout(() => {
                 document.addEventListener('click', handleOutsideSidebarClick, true);
             }, 100);
        }

        function closeSidebar() {
            tocSidebar.classList.remove('visible');
            tocSidebar.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('stoc-toc-sidebar-open');
            if(tocSidebarExternalClose) tocSidebarExternalClose.classList.remove('visible');

            const buttonRect = tocButtonWrapper.getBoundingClientRect();
            if (buttonRect.bottom < 0 || buttonRect.top > window.innerHeight) {
                 if(floatingTocIcon) floatingTocIcon.classList.add('visible');
            }

            document.removeEventListener('click', handleOutsideSidebarClick, true);

            if(floatingTocIcon && document.activeElement === tocSidebarInternalClose) {
                 floatingTocIcon.focus();
            } else if (tocSidebarExternalClose && document.activeElement === tocSidebarExternalClose){
                 floatingTocIcon?.focus();
            }
        }

        function handleOutsideSidebarClick(event) {
             if (tocSidebar.classList.contains('visible') &&
                 !tocSidebar.contains(event.target) &&
                 event.target !== floatingTocIcon &&
                 !floatingTocIcon?.contains(event.target) &&
                 event.target !== tocSidebarExternalClose &&
                 !tocSidebarExternalClose?.contains(event.target))
             {
                closeSidebar();
             }
        }

        if (floatingTocIcon) {
            floatingTocIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                openSidebar();
            });
        }
        if (tocSidebarInternalClose) {
            tocSidebarInternalClose.addEventListener('click', closeSidebar);
        }
        if (tocSidebarExternalClose) {
            tocSidebarExternalClose.addEventListener('click', closeSidebar);
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && tocSidebar.classList.contains('visible')) {
                closeSidebar();
            }
        });

        // --- TOC लिंक क्लिक हैंडलिंग और हाइलाइटिंग ---
        function handleTocLinkClick(event) {
            const linkElement = event.target.closest('a');
            if (linkElement && linkElement.dataset.targetId) {
                event.preventDefault();
                const targetId = linkElement.dataset.targetId;
                const targetElement = document.getElementById(targetId);

                linkElement.classList.add('stoc-toc-link-clicked');
                setTimeout(() => {
                    linkElement.classList.remove('stoc-toc-link-clicked');
                }, clickEffectDuration);

                if (targetElement) {
                    if (tocSidebar.classList.contains('visible')) {
                        closeSidebar();
                        setTimeout(() => { scrollToElement(targetElement); }, 300);
                    } else {
                        scrollToElement(targetElement);
                    }
                } else {
                    console.warn(`Stylish TOC: लक्ष्य तत्व आईडी के साथ नहीं मिला: ${targetId}`);
                }
            }
        }

        function scrollToElement(element) {
             const elementRect = element.getBoundingClientRect();
             const absoluteElementTop = elementRect.top + window.pageYOffset;
             const offsetPosition = absoluteElementTop - scrollOffset;

             window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

             setTimeout(() => {
                 applyHighlight(element);
             }, 700);
        }

        if (tocButtonList) tocButtonList.addEventListener('click', handleTocLinkClick);
        if (tocSidebarList) tocSidebarList.addEventListener('click', handleTocLinkClick);

        // --- हेडिंग और पैराग्राफ हाइलाइटिंग ---
        function applyHighlight(headingElement) {
            clearHighlight();

            headingElement.classList.add('stoc-toc-target-heading');
            currentlyHighlightedElements.push(headingElement);

            let nextElem = headingElement.nextElementSibling;
            const headingLevel = parseInt(headingElement.tagName.substring(1));

            while (nextElem) {
                const tagName = nextElem.tagName.toUpperCase();
                if (tagName.startsWith('H')) {
                    const nextLevel = parseInt(tagName.substring(1));
                    if (nextLevel <= headingLevel) { break; }
                }
                if (['P', 'UL', 'OL', 'DIV', 'BLOCKQUOTE', 'PRE', 'TABLE'].includes(tagName)) {
                    nextElem.classList.add('stoc-toc-target-paragraph');
                    currentlyHighlightedElements.push(nextElem);
                }
                else if (['BR', 'HR', 'SCRIPT', 'STYLE'].includes(tagName)) { /* Skip */ }
                else if (nextElem.offsetWidth > 0 && nextElem.offsetHeight > 0 && getComputedStyle(nextElem).display !== 'inline') { /* Stop? */ }

                nextElem = nextElem.nextElementSibling;
            }

             const cssDuration = getComputedStyle(document.documentElement).getPropertyValue('--stoc-popup-highlight-duration');
             let highlightDurationMs = highlightDurationFallback;
             if (cssDuration) {
                 try {
                     const durationValue = parseFloat(cssDuration);
                     if (cssDuration.toLowerCase().includes('ms')) {
                         highlightDurationMs = durationValue;
                     } else if (cssDuration.toLowerCase().includes('s')) {
                         highlightDurationMs = durationValue * 1000;
                     }
                 } catch (e) {
                     console.warn("Stylish TOC: Could not parse --stoc-popup-highlight-duration CSS variable.", e);
                 }
             }

            highlightTimeout = setTimeout(() => {
                currentlyHighlightedElements.forEach(el => {
                    el.classList.add('fading-out');
                    setTimeout(() => {
                        el.classList.remove('stoc-toc-target-heading', 'stoc-toc-target-paragraph', 'fading-out');
                    }, 500);
                });
                currentlyHighlightedElements = [];
            }, highlightDurationMs - 500);
        }

        function clearHighlight() {
            if (highlightTimeout) clearTimeout(highlightTimeout);
            highlightTimeout = null;
            currentlyHighlightedElements.forEach(el => {
                el.classList.remove('stoc-toc-target-heading', 'stoc-toc-target-paragraph', 'fading-out');
            });
            currentlyHighlightedElements = [];
        }

        // --- स्क्रॉल इंडिकेटर दृश्यता ---
        function checkScrollIndicatorVisibility(scrollbox, indicator) {
            if (!scrollbox || !indicator) return;
            let isVisible = indicator.classList.contains('visible');

            function check() {
                if (scrollbox === tocButtonScrollbox && tocButtonWrapper?.classList.contains('collapsed')) {
                    if (isVisible) { indicator.classList.remove('visible'); isVisible = false; }
                    return;
                }
                const isScrollable = scrollbox.scrollHeight > scrollbox.clientHeight + 5;
                const isNearTop = scrollbox.scrollTop < 20;
                const shouldBeVisible = isScrollable && isNearTop;
                if (shouldBeVisible && !isVisible) { indicator.classList.add('visible'); isVisible = true; }
                else if (!shouldBeVisible && isVisible) { indicator.classList.remove('visible'); isVisible = false; }
            }

            setTimeout(check, 250);
            scrollbox.addEventListener('scroll', check, { passive: true });
             if (scrollbox === tocButtonScrollbox && tocButtonHeader) {
                 tocButtonHeader.addEventListener('click', () => { setTimeout(check, 600); });
             }
             if (scrollbox === tocSidebarScrollbox && floatingTocIcon) {
                 floatingTocIcon.addEventListener('click', () => { setTimeout(check, 550); });
             }
             window.addEventListener('resize', check, { passive: true });
        }
    });
})();
/* ==========================================================================
   Stylish TOC JavaScript for Blogger (v1.1 - Prefixed with stoc-, Excludes Button Title)
   Host this file on GitHub Gist or similar.end
   ========================================================================== */

/* ==========================================================================
   खोजो और सीखो
   ========================================================================== */
(function() {
    let vsw_mainWidget,vsw_categoryButtonsContainer,vsw_categoryBanner,vsw_allSearchContainers,vsw_videoSliderContainer,vsw_videoDisplay,vsw_videoSliderNav,vsw_messageBox,vsw_videoSlider,vsw_youtubeIframe,vsw_messageTexts;
    let vsw_currentVideoItems=[],vsw_videoSlideIndex=0,vsw_itemsPerPage=4,vsw_activeSearchContainerId=null,vsw_messageTimeout,vsw_resizeTimeout,vsw_scrollTimeout;

    document.addEventListener('DOMContentLoaded',()=>{
        vsw_mainWidget=document.getElementById('vsw-main-widget');vsw_categoryButtonsContainer=document.getElementById('vsw-category-buttons');vsw_categoryBanner=document.getElementById('vsw-category-banner');vsw_allSearchContainers=document.querySelectorAll('.vsw-search-category-container');vsw_videoSliderContainer=document.getElementById('vsw-video-slider-container');vsw_videoDisplay=document.getElementById('vsw-video-display');vsw_videoSliderNav=document.getElementById('vsw-video-slider-nav');vsw_messageBox=document.getElementById('vsw-messageBox');vsw_videoSlider=document.getElementById('vsw-video-slider');vsw_youtubeIframe=document.getElementById('vsw-youtube-iframe');vsw_messageTexts=document.getElementById('vsw-message-texts');
        if(vsw_mainWidget&&vsw_categoryButtonsContainer&&vsw_messageTexts&&vsw_messageBox){
            vsw_setupCategoryButtons();vsw_setupBackButtons();vsw_setupOutsideClickListener();window.addEventListener('resize',vsw_handleResize);window.addEventListener('scroll',vsw_handleScroll);
            vsw_mainWidget.addEventListener('change',vsw_handleInputChange);vsw_mainWidget.addEventListener('input',vsw_handleInputChange);vsw_mainWidget.addEventListener('click',vsw_handleSearchButtonClick);
            vsw_showCategoriesAndBanner();
            vsw_allSearchContainers.forEach(container=>{container.style.display='none';container.classList.remove('vsw-active-search-box');container.style.opacity=0;});
            vsw_hideVideoSections();
        }else{
            console.error("VSW Error: Essential elements missing.");
            if(vsw_messageBox){vsw_messageBox.textContent="VSW Initialization Error: Essential elements missing.";vsw_messageBox.style.display='block';}
        }
    });

    function vsw_handleSearchButtonClick(event){
         const target=event.target;const searchButton=target.closest('.vsw-search-button');
         if(searchButton){
             const searchBox=searchButton.closest('.vsw-search-box');const categoryContainer=searchBox?searchBox.closest('.vsw-search-category-container'):null;
             if(categoryContainer&&categoryContainer.id===vsw_activeSearchContainerId){
                 if(searchButton.disabled){
                     event.preventDefault();event.stopPropagation();vsw_showMessage(vsw_getTextById('vsw-msgMinInputRequired'),4000);
                 }
                 // If search button is NOT disabled, the onclick="vsw_performSearch(...)" will handle it.
             }
         }
    }

    function vsw_handleInputChange(event){
         const target=event.target;
         if(target.tagName==='SELECT'||(target.tagName==='INPUT'&&target.classList.contains('vsw-custom-search-input'))){
             const searchBox=target.closest('.vsw-search-box');const categoryContainer=searchBox?searchBox.closest('.vsw-search-category-container'):null;
             if(searchBox&&categoryContainer&&categoryContainer.id===vsw_activeSearchContainerId){
                  vsw_checkInputsAndToggleSearchButton(searchBox);vsw_hideMessage();
             }
         }
    }

    function vsw_checkInputsAndToggleSearchButton(searchBoxElement){
         const searchButton=searchBoxElement.querySelector('.vsw-search-button');if(!searchButton)return;
         let inputCount=0;const selects=searchBoxElement.querySelectorAll('select');const textInput=searchBoxElement.querySelector('.vsw-custom-search-input');
         selects.forEach(select=>{if(select.value?.trim()&&select.value!==""){inputCount++;}});
         if(textInput&&textInput.value.trim()){inputCount++;}
         const minInputsRequired=parseInt(searchBoxElement.dataset.minInputs) || 2; // Read from data-attribute or default to 2
         if(inputCount>=minInputsRequired){searchButton.disabled=false;}else{searchButton.disabled=true;}
    }

    function vsw_showCategoriesAndBanner(){
         if(vsw_categoryButtonsContainer){
              vsw_categoryButtonsContainer.style.display='flex';
              setTimeout(()=>{vsw_categoryButtonsContainer.classList.remove('vsw-hidden');vsw_categoryButtonsContainer.style.opacity=1;},10);
         }
         if(vsw_categoryBanner){
             vsw_categoryBanner.style.display='block';
             setTimeout(()=>{vsw_categoryBanner.classList.remove('vsw-hidden');vsw_categoryBanner.style.opacity=1;},10);
         }
    }

    function vsw_hideCategoriesAndBanner(){
        if(vsw_categoryButtonsContainer){
             vsw_categoryButtonsContainer.style.opacity=0;
             const catBtnHandler=function(){this.style.display='none';this.removeEventListener('transitionend',catBtnHandler);};
             if(parseFloat(getComputedStyle(vsw_categoryButtonsContainer).opacity)>0){vsw_categoryButtonsContainer.addEventListener('transitionend',catBtnHandler,{once:true});}
             else{vsw_categoryButtonsContainer.style.display='none';}
             vsw_categoryButtonsContainer.classList.add('vsw-hidden');
        }
         if(vsw_categoryBanner){
             vsw_categoryBanner.style.opacity=0;
             const bannerHandler=function(){this.style.display='none';this.removeEventListener('transitionend',bannerHandler);};
             if(parseFloat(getComputedStyle(vsw_categoryBanner).opacity)>0){vsw_categoryBanner.addEventListener('transitionend',bannerHandler,{once:true});}
             else{vsw_categoryBanner.style.display='none';}
              vsw_categoryBanner.classList.add('vsw-hidden');
         }
    }

    function vsw_getTextById(id){
        if(!vsw_messageTexts){console.error("VSW Error: Message text container not found.");return`[${id}]`;}
        const element=vsw_messageTexts.querySelector(`#${id}`);
        if(element){return element.textContent||`[${id}]`;}else{console.warn(`VSW Warning: Message ID "${id}" not found.`);return`[${id}]`;}
    }

    function vsw_setupCategoryButtons(){
        if(!vsw_categoryButtonsContainer)return;
        const buttons=vsw_categoryButtonsContainer.querySelectorAll('button[data-target]');
        buttons.forEach(button=>{
            button.addEventListener('click',(event)=>{
                event.stopPropagation();const targetId=button.getAttribute('data-target');
                if(targetId){vsw_toggleCategory(targetId);}else{console.warn("VSW Warning: Button missing data-target.");}
            });
        });
    }

    function vsw_setupBackButtons(){
        const backButtons=document.querySelectorAll('.vsw-back-button');
        backButtons.forEach(button=>{
            button.addEventListener('click',(event)=>{event.stopPropagation();vsw_closeCurrentlyActiveCategory();});
        });
    }

    function vsw_closeCurrentlyActiveCategory(){
         if(vsw_activeSearchContainerId){
             const currentActiveContainer=document.getElementById(vsw_activeSearchContainerId);
             if(currentActiveContainer){
                 const searchButton=currentActiveContainer.querySelector('.vsw-search-button');if(searchButton){searchButton.disabled=true;}
                  currentActiveContainer.style.opacity=0;
                  const containerHandler=function(){this.style.display='none';this.classList.remove('vsw-active-search-box');
                       const selects=this.querySelectorAll('select');const textInput=this.querySelector('.vsw-custom-search-input');
                       selects.forEach(select=>select.value="");if(textInput)textInput.value="";
                       this.removeEventListener('transitionend',containerHandler);};
                  if(parseFloat(getComputedStyle(currentActiveContainer).opacity)>0){currentActiveContainer.addEventListener('transitionend',containerHandler,{once:true});}
                  else{currentActiveContainer.style.display='none';currentActiveContainer.classList.remove('vsw-active-search-box');
                       const selects=currentActiveContainer.querySelectorAll('select');const textInput=currentActiveContainer.querySelector('.vsw-custom-search-input');
                       selects.forEach(select=>select.value="");if(textInput)textInput.value="";}
                 vsw_hideVideoSections();vsw_clearVideoResults();
             }else{console.warn(`VSW Warning: Active container ID ${vsw_activeSearchContainerId} not found.`);}
             vsw_activeSearchContainerId=null;vsw_showCategoriesAndBanner();
         }vsw_hideMessage();
    }

    function vsw_toggleCategory(containerIdToShow){
        const containerToShow=document.getElementById(containerIdToShow);
        if(!containerToShow){console.error(`VSW Error: Target container ID ${containerIdToShow} not found.`);return;}
        if(containerIdToShow===vsw_activeSearchContainerId){vsw_closeCurrentlyActiveCategory();return;}
        if(vsw_activeSearchContainerId){
            const currentActiveContainer=document.getElementById(vsw_activeSearchContainerId);
             if(currentActiveContainer){
                  const searchButton=currentActiveContainer.querySelector('.vsw-search-button');if(searchButton){searchButton.disabled=true;}
                  currentActiveContainer.style.opacity=0;
                  const oldContainerHandler=function(){this.style.display='none';this.classList.remove('vsw-active-search-box');
                       const selects=this.querySelectorAll('select');const textInput=this.querySelector('.vsw-custom-search-input');
                       selects.forEach(select=>select.value="");if(textInput)textInput.value="";
                      this.removeEventListener('transitionend',oldContainerHandler);};
                  if(parseFloat(getComputedStyle(currentActiveContainer).opacity)>0){currentActiveContainer.addEventListener('transitionend',oldContainerHandler,{once:true});}
                  else{currentActiveContainer.style.display='none';currentActiveContainer.classList.remove('vsw-active-search-box');
                       const selects=currentActiveContainer.querySelectorAll('select');const textInput=currentActiveContainer.querySelector('.vsw-custom-search-input');
                       selects.forEach(select=>select.value="");if(textInput)textInput.value="";}
             }
        }vsw_hideCategoriesAndBanner();
        containerToShow.style.display='block';
        setTimeout(()=>{
             containerToShow.classList.add('vsw-active-search-box');containerToShow.style.opacity=1;
             const searchBoxElement=containerToShow.querySelector('.vsw-search-box');if(searchBoxElement){vsw_checkInputsAndToggleSearchButton(searchBoxElement);}
             setTimeout(()=>{const widgetRect=vsw_mainWidget.getBoundingClientRect();const targetScrollTop=window.pageYOffset+widgetRect.top;window.scrollTo({top:targetScrollTop,behavior:'smooth'});},400);
        },10);
        vsw_activeSearchContainerId=containerIdToShow;vsw_clearVideoResults();vsw_hideVideoSections();vsw_itemsPerPage=vsw_calculateItemsPerPage();vsw_hideMessage();
    }

    function vsw_setupOutsideClickListener(){
        if(!vsw_mainWidget)return; // Ensure main widget exists
        document.addEventListener('click',(event)=>{
            if(!vsw_activeSearchContainerId)return;
             // Check if the click occurred inside the main widget container
             if(vsw_mainWidget.contains(event.target)){
                 return;
             }
            // If click is outside the main widget and a category is active, close it
            vsw_closeCurrentlyActiveCategory();
        });
    }

    function vsw_handleScroll(){
         clearTimeout(vsw_scrollTimeout);
         vsw_scrollTimeout=setTimeout(()=>{
             if(vsw_activeSearchContainerId&&vsw_mainWidget){
                 if(vsw_videoDisplay&&vsw_videoDisplay.style.display!=='none'){
                      return;
                 }
                 const widgetRect=vsw_mainWidget.getBoundingClientRect();const threshold=Math.min(widgetRect.height*.3,window.innerHeight*.3);
                 const isOutOfView=(widgetRect.bottom<threshold||widgetRect.top>window.innerHeight-threshold);
                 if(isOutOfView){vsw_closeCurrentlyActiveCategory();}
             }
         },100);
    }

    async function vsw_fetchYouTubeData(searchTerm=''){
        const apiKeyElement = document.getElementById('vsw-api-key');
        const apiKey = apiKeyElement ? apiKeyElement.textContent.trim() : '';

        if(!apiKey||apiKey==='YOUR_API_KEY_HERE'||apiKey.length<30){
             console.error("VSW Error: API Key config missing/invalid.");
             vsw_showMessage(vsw_getTextById('vsw-msgApiKeyError') + (apiKey.startsWith('AIzaSyB') ? " (Demo Key)" : ""),8000);
             vsw_hideVideoSections();vsw_clearVideoResults();return;
        }
        if (apiKey.startsWith('AIzaSyB')) { // Common prefix for public demo keys
             console.warn("VSW Warning: Using a public demo API key. Quota may be limited.");
        }

        const apiHost='youtube.googleapis.com';const maxResults=30;const safeSearchTerm=searchTerm||'educational videos in Hindi';
        let apiUrl=`https://${apiHost}/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&key=${apiKey}`;
        apiUrl+=`&q=${encodeURIComponent(safeSearchTerm)}`;
         const hasHindiChars=/[\u0900-\u097F]/.test(safeSearchTerm);const hasCommonHindiWords=/\b(हिंदी|कक्षा|परीक्षा|विज्ञान|गणित|इतिहास|भूगोल|समाचार|लाइव|कहानी|कविता)\b/i.test(safeSearchTerm);
        if(hasHindiChars||hasCommonHindiWords||safeSearchTerm.toLowerCase().includes("hindi")){apiUrl+=`&relevanceLanguage=hi`;}
        vsw_showMessage(vsw_getTextById('vsw-msgSearchingVideos'),2500);vsw_hideVideoSections();vsw_clearVideoResults();
        try{
            const response=await fetch(apiUrl,{method:'GET',headers:{'Accept':'application/json'}});
            const data=await response.json();
            if(!response.ok){
                console.error('VSW API Error Response:',data);let errorId='vsw-msgApiGenericErrorPrefix';let errorDetails=`(${response.status})`;
                if(data.error?.message){
                    if(data.error.errors?.[0]?.reason==='quotaExceeded'){errorId='vsw-msgApiQuotaError';errorDetails='';}
                    else if(data.error.errors?.[0]?.reason==='keyInvalid'){errorId='vsw-msgApiKeyInvalid';errorDetails='';}
                    else{errorDetails=`:${data.error.message}`;}
                }else{errorDetails=`(${response.status})`;}
                const apiError=new Error(vsw_getTextById(errorId)+errorDetails);apiError.statusCode=response.status;throw apiError;
            }
            if(!data?.items||data.items.length===0){
                vsw_showMessage(vsw_getTextById('vsw-msgNoVideosFound'),4000);vsw_hideVideoSections();vsw_clearVideoResults();vsw_currentVideoItems=[];return;
            }
            vsw_currentVideoItems=data.items.filter(item=>item.id?.videoId&&item.snippet);
            if(vsw_currentVideoItems.length===0){
                 vsw_showMessage(vsw_getTextById('vsw-msgNoVideosFound')+" (valid items not found)",4000);
                vsw_hideVideoSections();vsw_clearVideoResults();return;
            }
            vsw_displayVideos(vsw_currentVideoItems);vsw_showVideoSections();vsw_hideMessage();
        }catch(error){
            console.error('VSW Fetch Error:',error);let displayError=vsw_getTextById('vsw-msgInternalError');
            if(error.message&&(error.message.startsWith(vsw_getTextById('vsw-msgApiGenericErrorPrefix'))||error.message.startsWith(vsw_getTextById('vsw-msgApiQuotaError'))||error.message.startsWith(vsw_getTextById('vsw-msgApiKeyInvalid'))||error.message.startsWith(vsw_getTextById('vsw-msgApiKeyError')))){
                 displayError=error.message;
             }else if(error.message){displayError=`${vsw_getTextById('vsw-msgVideoLoadErrorPrefix')}: ${error.message.substring(0,100)}...`;}
            vsw_showMessage(displayError,6000);vsw_hideVideoSections();vsw_clearVideoResults();vsw_currentVideoItems=[];
        }
    }

    function vsw_displayVideos(videos){
        if(!vsw_videoSlider||!vsw_videoSliderContainer||!vsw_videoDisplay||!vsw_youtubeIframe){console.error("VSW Video display elements not found.");return;}
        vsw_videoSlider.innerHTML='';vsw_videoSlideIndex=0;vsw_currentVideoItems=videos;
        if(!vsw_currentVideoItems||vsw_currentVideoItems.length===0){
            if(vsw_videoSliderContainer){vsw_videoSlider.innerHTML=`<p style="color:#ccc; padding: 20px; text-align: center; width: 100%;">${vsw_getTextById('vsw-msgNoVideosFound')}</p>`;vsw_videoSliderContainer.style.display='block';}
            if(vsw_videoSliderNav)vsw_videoSliderNav.style.display='none';if(vsw_youtubeIframe)vsw_youtubeIframe.src='';if(vsw_videoDisplay)vsw_videoDisplay.style.display='none';return;
        }
        vsw_currentVideoItems.forEach((video,index)=>{
            if(!video.id?.videoId||!video.snippet){console.warn("VSW Skipping invalid video item:",video);return;}
            const videoId=video.id.videoId;const videoTitle=video.snippet.title||'Untitled Video';
            const thumbnailUrl=video.snippet.thumbnails?.medium?.url||video.snippet.thumbnails?.default?.url||'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            const videoItem=document.createElement('div');videoItem.classList.add('vsw-video-item');videoItem.setAttribute('data-index',index);videoItem.setAttribute('data-videoid',videoId);
            const thumbnail=document.createElement('img');thumbnail.src=thumbnailUrl;thumbnail.alt=videoTitle;
            thumbnail.onerror=function(){this.onerror=null;this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';console.warn(`VSW Thumbnail failed for ${videoId}`);};
            const title=document.createElement('p');const tempEl=document.createElement('textarea');tempEl.innerHTML=videoTitle;title.textContent=tempEl.value;
            videoItem.appendChild(thumbnail);videoItem.appendChild(title);
            videoItem.addEventListener('click',()=>{vsw_displayEmbeddedVideo(videoId);
                if(vsw_videoDisplay&&vsw_videoDisplay.style.display!=='none'){
                    const playerRect=vsw_videoDisplay.getBoundingClientRect();
                    const headerHeight = 70; // Example fixed header height
                    if(playerRect.top < headerHeight){window.scrollTo({top:window.pageYOffset+playerRect.top-headerHeight - 10,behavior:'smooth'});}
                }
            });
            vsw_videoSlider.appendChild(videoItem);
        });
        if(vsw_currentVideoItems.length>0&&vsw_currentVideoItems[0].id?.videoId){vsw_displayEmbeddedVideo(vsw_currentVideoItems[0].id.videoId);}
        else{if(vsw_youtubeIframe)vsw_youtubeIframe.src='';if(vsw_videoDisplay)vsw_videoDisplay.style.display='none';}
        vsw_itemsPerPage=vsw_calculateItemsPerPage();vsw_updateVideoSlider();
        if(vsw_videoSliderContainer)vsw_videoSliderContainer.style.display='block';
        if(vsw_videoSliderNav){vsw_videoSliderNav.style.display=vsw_currentVideoItems.length>vsw_itemsPerPage?'flex':'none';}
    }

    function vsw_displayEmbeddedVideo(videoId){
        if(!vsw_youtubeIframe||!vsw_videoDisplay)return;
        if(!videoId){vsw_youtubeIframe.src='';vsw_videoDisplay.style.display='none';return;}
        vsw_youtubeIframe.src=`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&hl=hi`;
        vsw_videoDisplay.style.display='block';
        vsw_youtubeIframe.onerror=()=>{console.error('VSW iFrame failed to load video ID:',videoId);vsw_showMessage(vsw_getTextById('vsw-msgVideoLoadFailed'),3000);vsw_videoDisplay.style.display='none';};
        vsw_youtubeIframe.onload=()=>{console.log(`VSW iFrame loaded ID: ${videoId}`);if(vsw_youtubeIframe.src.includes(videoId)){vsw_videoDisplay.style.display='block';}};
        if(!vsw_youtubeIframe.src||vsw_youtubeIframe.src==='about:blank'){vsw_videoDisplay.style.display='none';}
    }

    function vsw_clearVideoResults(){
        if(vsw_videoSlider)vsw_videoSlider.innerHTML='';
        if(vsw_youtubeIframe){if(vsw_youtubeIframe.contentWindow){try{vsw_youtubeIframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}','*');}catch(e){/*ignore*/}}vsw_youtubeIframe.src='';}
        vsw_currentVideoItems=[];vsw_videoSlideIndex=0;
    }

    function vsw_calculateItemsPerPage(){
        if(!vsw_videoSliderContainer||vsw_videoSliderContainer.offsetWidth<=0){
             const itemWidth=150;const itemMargin=12;const itemTotalWidth=itemWidth+itemMargin;
             const containerWidthFallback=vsw_mainWidget?vsw_mainWidget.offsetWidth*.95-50:window.innerWidth*.95-50;
             const calculated=Math.max(1,Math.floor(containerWidthFallback/itemTotalWidth));return calculated;
        }
        const containerWidth=vsw_videoSliderContainer.offsetWidth-20;const itemWidth=150;const itemMargin=12;const itemTotalWidth=itemWidth+itemMargin;
        if(containerWidth<=0||itemTotalWidth<=0){return 1;}
        const calculatedItems=Math.max(1,Math.floor(containerWidth/itemTotalWidth));return calculatedItems;
    }

    // Made global for onclick attribute in HTML
    window.vsw_slideVideo = function(direction){
        const numVideoItems=vsw_currentVideoItems.length;vsw_itemsPerPage=vsw_calculateItemsPerPage();
        if(numVideoItems<=vsw_itemsPerPage)return;
        const maxIndex=Math.max(0,numVideoItems-vsw_itemsPerPage);let newIndex=vsw_videoSlideIndex+direction;
        vsw_videoSlideIndex=Math.max(0,Math.min(maxIndex,newIndex));vsw_updateVideoSlider();
    }

    function vsw_updateVideoSlider(){
        if(!vsw_videoSlider||vsw_currentVideoItems.length===0){if(vsw_videoSlider)vsw_videoSlider.style.transform='translateX(0px)';return;}
        const itemWidth=150;const itemMargin=12;const slideAmount=-vsw_videoSlideIndex*(itemWidth+itemMargin);
        vsw_videoSlider.style.transform=`translateX(${slideAmount}px)`;
    }

    function vsw_handleResize(){
        clearTimeout(vsw_resizeTimeout);
        vsw_resizeTimeout=setTimeout(()=>{
            if(vsw_videoSliderContainer&&vsw_videoSliderContainer.style.display!=='none'){
                const oldItemsPerPage=vsw_itemsPerPage;vsw_itemsPerPage=vsw_calculateItemsPerPage();
                if(oldItemsPerPage!==vsw_itemsPerPage){
                    const maxIndex=Math.max(0,vsw_currentVideoItems.length-vsw_itemsPerPage);
                    vsw_videoSlideIndex=Math.min(vsw_videoSlideIndex,maxIndex);vsw_updateVideoSlider();
                    if(vsw_videoSliderNav){vsw_videoSliderNav.style.display=vsw_currentVideoItems.length>vsw_itemsPerPage?'flex':'none';}
                }
            }
             if(vsw_activeSearchContainerId){
                  const activeContainer=document.getElementById(vsw_activeSearchContainerId);
                  if(activeContainer){const searchBoxElement=activeContainer.querySelector('.vsw-search-box');if(searchBoxElement){vsw_checkInputsAndToggleSearchButton(searchBoxElement);}}
             }
        },250);
    }
    
    // Made global for onclick attribute in HTML
    window.vsw_performSearch = function(searchBoxId){
        const searchBox=document.getElementById(searchBoxId);if(!searchBox){console.error("VSW Error: Search box not found:",searchBoxId);vsw_showMessage(vsw_getTextById('vsw-msgInternalError'),4000);return;}
         const searchButton=searchBox.querySelector('.vsw-search-button');if(searchButton&&searchButton.disabled){console.warn("VSW: performSearch called on disabled button.");vsw_showMessage(vsw_getTextById('vsw-msgMinInputRequired'),4000);return;}
        let finalSearchTerm='';let inputCount=0;let dropdownSearchTerm='';
        const selects=searchBox.querySelectorAll('select');const textInput=searchBox.querySelector('.vsw-custom-search-input');
        selects.forEach(select=>{if(select.value?.trim()&&select.value!==""){dropdownSearchTerm+=select.value.trim()+' ';inputCount++;}});
        dropdownSearchTerm=dropdownSearchTerm.trim();const textValue=textInput?textInput.value.trim():'';
        if(textValue){inputCount++;}
        
        const minInputsRequired=parseInt(searchBox.dataset.minInputs) || 2;

        if(inputCount<minInputsRequired){console.warn(`VSW: performSearch called with insufficient inputs (${inputCount}/${minInputsRequired}).`);vsw_showMessage(vsw_getTextById('vsw-msgMinInputRequired'),4000);return;}
         if(textValue){finalSearchTerm=(dropdownSearchTerm+' '+textValue).trim();}else{finalSearchTerm=dropdownSearchTerm;}
        vsw_hideMessage();console.log(`VSW Performing search for: "${finalSearchTerm}"`);vsw_fetchYouTubeData(finalSearchTerm);
    }

    function vsw_showVideoSections(){
        if(vsw_currentVideoItems&&vsw_currentVideoItems.length>0){
            if(vsw_videoSliderContainer&&vsw_videoSliderContainer.style.display==='none'){vsw_videoSliderContainer.style.display='block';}
            if(vsw_youtubeIframe&&vsw_youtubeIframe.src&&vsw_youtubeIframe.src!=='about:blank'&&vsw_videoDisplay&&vsw_videoDisplay.style.display==='none'){vsw_videoDisplay.style.display='block';}
            vsw_itemsPerPage=vsw_calculateItemsPerPage();
            if(vsw_videoSliderNav){vsw_videoSliderNav.style.display=vsw_currentVideoItems.length>vsw_itemsPerPage?'flex':'none';}
        }else{vsw_hideVideoSections();}
    }

    function vsw_hideVideoSections(){
        if(vsw_videoSliderContainer)vsw_videoSliderContainer.style.display='none';if(vsw_videoDisplay)vsw_videoDisplay.style.display='none';if(vsw_videoSliderNav)vsw_videoSliderNav.style.display='none';
    }

    function vsw_showMessage(messageText,duration=3000){
        if(!vsw_messageBox)return;
        clearTimeout(vsw_messageTimeout);
        const textToShow=messageText||vsw_getTextById('vsw-msgInternalError');
        vsw_messageBox.textContent=textToShow;vsw_messageBox.style.display='block';
        if(duration>0){vsw_messageTimeout=setTimeout(vsw_hideMessage,duration);}
    }

    function vsw_hideMessage(){if(!vsw_messageBox)return;clearTimeout(vsw_messageTimeout);vsw_messageBox.style.display='none';}
})();
/* ==========================================================================
   खोजो और सीखो समाप्त
   ========================================================================== */

/* ==========================================================================
   सर्कुलर मेन्यू
   ========================================================================== */
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // मेन्यू टॉगल बटन और मेन्यू एलिमेंट्स प्राप्त करें
        const menuToggle = document.querySelector('.cm__menu-toggle');
        const categoriesMenu = document.querySelector('.cm__menu-categories');
        const linksMenu = document.querySelector('.cm__menu-links');
        const linksTitle = linksMenu ? linksMenu.querySelector('.cm__links-title') : null;
        const categoryTitleElement = categoriesMenu ? categoriesMenu.querySelector('.cm__category-title') : null;

        // सभी कैटेगरी एलिमेंट्स प्राप्त करें
        const categories = document.querySelectorAll('.cm__category');

        // सभी लिंक्स कंटेंट एलिमेंट्स प्राप्त करें
        const linksContent = linksMenu ? linksMenu.querySelectorAll('.cm__links-content .cm__links') : [];

        // आइकन मैपिंग (data-category values are prefixed)
        const categoryIcons = {
            'cm__class-1-5': '<i class="fas fa-book-reader"></i>', 'cm__class-6-8': '<i class="fas fa-graduation-cap"></i>',
            'cm__class-9-10': '<i class="fas fa-school"></i>', 'cm__class-11-12': '<i class="fas fa-university"></i>',
            'cm__competitive-exam': '<i class="fas fa-trophy"></i>', 'cm__news-channel': '<i class="fas fa-newspaper"></i>',
            'cm__yoga-ayurveda': '<i class="fas fa-heart"></i>', 'cm__marriage-links': '<i class="fas fa-ring"></i>',
            'cm__editorial-links': '<i class="fas fa-edit"></i>', 'cm__government-links': '<i class="fas fa-flag"></i>',
            'cm__astrology-links': '<i class="fas fa-star"></i>', 'cm__vaidik-links': '<i class="fas fa-om"></i>'
        };

        // Gradient classes (prefixed)
        const gradientClasses = [
            'cm__gradient-1', 'cm__gradient-2', 'cm__gradient-3', 'cm__gradient-4', 'cm__gradient-5', 'cm__gradient-6',
            'cm__gradient-7', 'cm__gradient-8', 'cm__gradient-9', 'cm__gradient-10', 'cm__gradient-11', 'cm__gradient-12'
        ];

        function removeGradientClasses(element) {
             gradientClasses.forEach(cls => element.classList.remove(cls));
         }

        if (!menuToggle || !categoriesMenu || !linksMenu) {
            console.warn("Circular Menu Error: Essential menu elements not found.");
            return;
        }

        menuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isActive = categoriesMenu.classList.contains('cm__active');

            if (isActive) {
                categoriesMenu.classList.remove('cm__active');
                linksMenu.classList.remove('cm__show');
                if(categoryTitleElement) categoryTitleElement.style.display = 'none';
            } else {
                 linksMenu.classList.remove('cm__show');
                 categoriesMenu.classList.add('cm__active');
                 if(categoryTitleElement) {
                    categoryTitleElement.style.display = 'block';
                    removeGradientClasses(categoryTitleElement);
                    const randomGradientIndex = Math.floor(Math.random() * gradientClasses.length);
                    categoryTitleElement.classList.add(gradientClasses[randomGradientIndex]);
                    categoryTitleElement.innerHTML = '<i class="fas fa-hand-point-down"></i> अपनी पसंद पर क्लिक करें';
                 }
            }
        });

         categories.forEach((category, index) => {
             category.addEventListener('click', (event) => {
                 event.stopPropagation();

                 const categoryData = category.getAttribute('data-category'); // e.g., "cm__class-1-5"
                 const titleText = category.getAttribute('data-title');
                 const iconHtml = categoryIcons[categoryData] || '<i class="fas fa-link"></i>';

                 linksContent.forEach(linkBox => {
                     linkBox.style.display = 'none';
                 });
                 
                 // categoryData is already prefixed, e.g., "cm__class-1-5"
                 const targetLinks = linksMenu.querySelector(`.cm__links-content .${categoryData}`);
                 if (targetLinks) {
                     targetLinks.style.display = 'block';
                 } else {
                     console.warn(`Links section for category '${categoryData}' not found.`);
                 }

                 if(linksTitle) {
                    linksTitle.innerHTML = `${iconHtml} ${titleText}`;
                    removeGradientClasses(linksTitle);
                    linksTitle.classList.add(gradientClasses[index % gradientClasses.length]);
                 }
                 
                 if(categoriesMenu) categoriesMenu.classList.remove('cm__active');
                 if(linksMenu) linksMenu.classList.add('cm__show');
                 if(categoryTitleElement) categoryTitleElement.style.display = 'none';
             });
         });

        document.addEventListener('click', (event) => {
            if (menuToggle && categoriesMenu && linksMenu &&
                !menuToggle.contains(event.target) &&
                !categoriesMenu.contains(event.target) &&
                !linksMenu.contains(event.target)
            ) {
                categoriesMenu.classList.remove('cm__active');
                linksMenu.classList.remove('cm__show');
                if (categoryTitleElement) {
                     categoryTitleElement.style.display = 'none';
                 }
            }
        });
    });
})();
/* ==========================================================================
   सर्कुलर मेन्यू समाप्त
   ========================================================================== */
