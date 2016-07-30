/*
 MIT License

 Copyright (c) 2016 Gregory Lafrance

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

(function(global) {
  'use strict';
  
  // Our app lives in a single global variable to avoid poluting the
  // global namespace, and to avoid conflict with other frameworks.
  global.PARAJP = global.PARAJP || (global.PARAJP = (function () {
    // private members within the PARAJP namespace
    // IMPORTANT - refer to these private variables in the code without "this." 
    //               or "PARAJP." because if you use them you won't get
    //               the private variable.
    
    // ********* PRIVATE PROPERTIES AND METHODS *********
    // The app version.
    var _version = "1.0.0";
    
    // main content container where we add content
    var _pageContent;
    
    // Typically used for vocabulary items, flashcards, etc. 
    // The current list of words (or phrases, etc.), translations, etc.
    var _currentData = [];
    
    // Used to detect when word list has already been loaded.
    var _currentDataType = "";
    
    // Number of data items in the currently loaded word list.
    var _currentDataLength = 0;
    
    // Used for "next" and "previous" for example when iterating
    // through flash cards for the word list.
    var _currentDataCursor = 0;
    
    // Will be set to the flash card UI elements that display
    // the current flash card kanji, furigana, romanji, English.
    var _jFlash = null;
    var _fFlash = null;
    var _rFlash = null;
    var _eFlash = null;
    
    // Will be set to the UI element displaying progress iterating
    // through a word list, for example "card 1 of 357".
    var _flashcardCounter = null;
    // ********* END PRIVATE PROPERTIES AND METHODS *********

    // public interface to DYNAMIC_LAYOUT
    // No direct access to privates.
    return {
      // return the framework version
      getVersion: function () {
        return _version;
      },
      
      // onload event handler for application initialization and setup
      initApp: function () {
        // set up event listeners in the app
        this.setEventListeners();   
        
        // Add the Google Analytics <script> tag with the trackingID.
        this.addGoogleAnalytics();
        
        // Get and store a reference to the main content container.
        _pageContent = document.getElementById('page-content');
        
      },
      
      // set up event listeners in the app
      setEventListeners: function () {
        this.otherSitesListeners();       
      },
      
      /**
       * Add the Google Analytics <script> tag.
       * This is so we don't need our trackingID submitted to git.
       */
      addGoogleAnalytics: function () {
        var data, url, urlRoot = '', options = {};
        var callback, scriptTagData, scriptTag;
        
        scriptTagData = "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){" +
          "(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o)," +
          "m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)" +
          "})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');" +
          "ga('create', 'TRACKING_ID', 'auto');" +
          "ga('send', 'pageview');";
        
        url = 'google_analytics.json';

        // After the trackingID has been obtained, add the 
        // Google Analytics <script> tag.
        callback = function (options) {
          if (options) {
            if (options.hasOwnProperty('data')) {
              data = JSON.parse(options.data);
              if (data.hasOwnProperty('trackingID')) {
                scriptTagData = scriptTagData.replace('TRACKING_ID', data.trackingID);  
                
                scriptTag = document.createElement('script');
                scriptTag.innerHTML = scriptTagData;
                document.head.appendChild(scriptTag);
              }
            }
          }
        };

        this.makePageRequest({
          url: url,
          urlRoot: urlRoot,
          callback: callback,
          contentType: 'application/json',
          callbackOptions: options
        });
      },

      // When the UI element prompting user to see other Paragonica
      // sites is tapped (= clicked) on mobile, show the "other sites" links
      // Necessary because combobox change events do not work well on mobile.
      otherSitesListeners: function () {
        var otherSitesNav = document.getElementById('otherSitesNav');
        var otherSitesNavLinks = otherSitesNav.getElementsByTagName('li');

        document.getElementById('otherSitesTitleShort').onclick = function () {
          for (var idx = 0;idx < otherSitesNavLinks.length;idx++) {
            otherSitesNavLinks.item(idx).style.visibility = "visible";
          }    
        };  
      },

      /**
       * @param targetItem  - item on which to add an event
       * @param eventType   - for example 'click', 'blur', etc.
       * @param callback    - the event handler function
       * @param eventReturn - Boolean indicating events will be dispatched 
       *                       to registered listener before being dispatched 
       *                       to any event target beneath it in the DOM tree. 
       *
       * Safely add an event listener, rather than wipe out an existing
       * listener with something like onresize="blahblah()"
       */
      addEvent: function (targetItem, eventType, callback, eventReturn) {
        if (targetItem == null || typeof(targetItem) == 'undefined') {
          return;
        }
        if (targetItem.addEventListener) {
          targetItem.addEventListener(eventType, callback, eventReturn ? true : false);
        } else if (targetItem.attachEvent) {
          targetItem.attachEvent("on" + eventType, callback);
        } else {
          targetItem["on" + eventType] = callback;
        }
      },
      
      /**
       * @param category  - string describing category of the words to study,
       *                     for example computing, medical, finance, etc.
       * @param action  - string how to present the words to study,
       *                     for example vocab (list), flashcards, etc.
       *
       * Get the content for a page and place it in the page-content container.
       * Note that this function is the first in a series of functions
       * involved in the dynamic process of getting a page html template,
       * and possibly modifying the template with data driven content.
       *
       * This makes it possible to have tab-delimited text files with word
       * lists, where each line has the kanji, furigana, romaji and English.
       * This also makes it possible to specify the category of the word list
       * (computing terms, medical terms, etc.) and to specify the type of page
       * to render, such as vocab (list), flashcards, etc. which reduces the
       * effort to generate multiple pages for this site.
       */
      showPage: function (category, action) {
        var data, url, urlRoot = 'resources/pages/', options = {}, callback;
        
        if (category && action) {
          // A file must exist, such as pages/vocab.html, pages/flashcards.html, etc.
          url = action + '.html';

          // Wipe out any content that was previously displayed.
          _pageContent.style.display = "none";
          _pageContent.innerHTML = "";

          // There is more to do after getting the page, and the options
          // and the callback will handle this.
          options.category = category;
          options.action = action;
          
          // In general, the html for a web page is obtained, that html is
          // placed into the page-content div on index.html, and then that
          // html may have elements appended to it for the specific content.
          callback = this.getData;

          this.makePageRequest({
            url: url,
            urlRoot: urlRoot,
            callback: callback,
            contentType: 'text/html',
            callbackOptions: options
          });
        }
      },
      
      /**
       * @param options  - an object with properties that control the
       *                    category of Japanese terms and the type of 
       *                    content to be displayed. Typically the template
       *                    page html is also passed in the options, as this
       *                    call gets the data used to populate the template.
       *
       * This function is responsible for getting the data, typically a word
       * list, that will be used to inject data into a page template. A check
       * is made because if a word list category has already been fetched,
       * there is no need to get it again. Only one fetched word list is stored.
       */
      getData: function (options) {
        var url, urlRoot = 'resources/data/';
        
        if (options) {
          if (options.hasOwnProperty('category') && 
              options.hasOwnProperty('action') &&
              options.hasOwnProperty('data')
             ) {        

            // If the target word list category was previously
            // fetched and stored, no need to get it again, just
            // render the data in the page template.
            if (_currentDataType === options.category) {
              PARAJP.processAction(options.action, options.data);
            } else {
              // Target word list category was NOT previously
              // fetched and stored, so get it now.
              // A file must exist, such as data/computing.txt.
              url =  options.category + '.txt';
              options['htmlPage'] = options.data;
              
              PARAJP.makePageRequest({
                url: url,
                urlRoot: urlRoot,
                callback: PARAJP.processData,
                callbackOptions: options,
                contentType: 'text/plain'
              });        
            }            
          }          
        }        
      },
      
      /**
       * @param options  - an object with properties that control the
       *                    type of content to be displayed. Typically 
       *                    the template page html is also passed in the 
       *                    options, and also the data used to populate the template.
       *
       * Process the tab-delimited data typically kanji, furigana, romaji and English.
       * The data is placed in a private array, so it will then be available when
       * the actual page template is modified using the data, or to be used as the
       * user progresses through sets of flashcards.
       */
      processData: function (options) {
        // Naive approach for now, putting all items in memory,
        // later use a database to get a smaller set of data as necessary.
        var items = [], idx, len, curr;

        if (options && 
            options.hasOwnProperty('action') &&
            options.hasOwnProperty('htmlPage') &&
            options.hasOwnProperty('data')
           ) {
          
          // Wipe out the word list data in memory, and the convenience length variable.
          _currentData = [];
          _currentDataLength = 0;
          
          // Store the word list category, used to avoid fetching the word lists
          // already loaded (though only a single word list is stored).
          _currentDataType = options.category;

          items = options.data.split('\n');
          len = items.length;
          
          // set to length - 1 to ignore header in data
          _currentDataLength = items.length - 1;  

          // start at index 1 to ignore header in data
          for (idx = 1;idx < len;idx++) {
            curr = items[idx].split('\t');
            _currentData.push([curr[0].replace(/"/g, ''), curr[1].replace(/"/g, ''), 
              curr[2].replace(/"/g, ''), curr[3].replace(/"/g, '')]);
          }         
        }
        
        PARAJP.processAction(options.action, options.htmlPage);
      },
      
      /**
       * @param action  - string specifying the type of content to be displayed. 
       * @param htmlPage      - the template page html
       *
       * Direct page rendering to process the page depending on the type
       * of page to be displayed. For example, for flashcards, populate the
       * first flashcard to be displayed. For a vocabulary list, build the table
       * of words or phrases to be presented for study.
       */
      processAction: function (action, htmlPage) {
        switch (action) {
          case 'flashcards':
            PARAJP.processFlashcards(htmlPage);
            break;
          case 'vocab':
            PARAJP.processVocab(htmlPage);    
            break;
          default:
            // nothing here
            break;
        }
      },
      
      /**
       * @param htmlPage      - the template page html
       *
       * Populate the first flashcard to be displayed.
       */
      processFlashcards: function (htmlPage) {  
        var title = "", titleParts, idx, len;
        
        if (_currentDataType.indexOf('_') === -1) {
          title = _currentDataType.charAt(0).toUpperCase() + _currentDataType.substr(1);
        } else {
          titleParts = _currentDataType.split('_');
          for (idx = 0, len = _currentDataType.length;idx < len;idx++) {
            title += titleParts[idx].charAt(0).toUpperCase() + titleParts[idx].substr(1);
          }
        }
        
        _currentDataCursor = 0;
        _pageContent.innerHTML = htmlPage;
                
        document.getElementById('page-title').innerHTML = title + ' Flashcards';
        document.getElementById('page-title-short').innerHTML = title + '<br />Flashcards';
        
        _jFlash = document.getElementById('jFlash'); 
        _fFlash = document.getElementById('fFlash'); 
        _rFlash = document.getElementById('rFlash'); 
        _eFlash = document.getElementById('eFlash'); 
        _flashcardCounter = document.getElementById('flashcard-counter');
        
        _jFlash.textContent = _currentData[_currentDataCursor][0];
        _fFlash.textContent = _currentData[_currentDataCursor][1];
        _rFlash.textContent = _currentData[_currentDataCursor][2];
        _eFlash.textContent = _currentData[_currentDataCursor][3];        
        
        _jFlash.style.visibility = "visible";
        _rFlash.style.visibility = "visible";
        
        if (_currentData[_currentDataCursor][0] !== _currentData[_currentDataCursor][1]) {
          _fFlash.style.visibility = "visible";          
        } else {
          _fFlash.style.visibility = "hidden";          
        }
        
        _flashcardCounter.textContent = "card 1 of " + _currentDataLength;
        _pageContent.style.display = "block";
      },

      /**
       * @param htmlPage      - the template page html
       *
       * Build the table of words or phrases to be presented for study.
       */
      processVocab: function (htmlPage) { 
        var title = "", titleParts, idx, len;
        
        if (_currentDataType.indexOf('_') === -1) {
          title = _currentDataType.charAt(0).toUpperCase() + _currentDataType.substr(1);
        } else {
          titleParts = _currentDataType.split('_');
          for (idx = 0, len = titleParts.length;idx < len;idx++) {
            title += titleParts[idx].charAt(0).toUpperCase() + titleParts[idx].substr(1);
            if (idx < len - 1) {
              title += ' ';
            }
          }
        }

        _pageContent.innerHTML = htmlPage;

        document.getElementById('page-title').innerHTML = title + ' Vocabulary';
        document.getElementById('page-title-short').innerHTML = title + '<br />Vocabulary';

        var vocabItem, item;
        var vocabTable = document.getElementById('vocab_table');
        var idx1, len1 = _currentData.length;
        var itemArr = ['kanji', 'furigana', 'romanji', 'english'];
        var idx2, len2 = itemArr.length;
        
        for (idx1 = 0;idx1 < len1;idx1++) {
          vocabItem = document.createElement('tr');
          for (idx2 = 0;idx2 < len2;idx2++) {
            item = document.createElement('td');
            item.classList = itemArr[idx2];
            item.textContent = _currentData[idx1][idx2];            
            vocabItem.appendChild(item);
          }
          vocabTable.appendChild(vocabItem);
        }
        
        _pageContent.style.display = "block";
      },

      // User clicked button because they want to see the English
      // translation for the Japanese for the current flashcard.
      showEnglish: function () {
        _eFlash.style.visibility = "visible";
      },
      
      /**
       * @param direction - string indicating to show the next or previous flashcard
       *
       * User clicked button to see the next or previous flashcard.
       */
      moveFlashCard: function (direction) {
        // The English and furigana fields are initially hidden. English
        // is hidden because user should try to remember the English,
        // and furigana is hidden because if the Japanese is katakana
        // we won't show the furigana.
        _eFlash.style.visibility = "hidden";
        _fFlash.style.visibility = "hidden";    
        
        // If they are at the end of the word list and want to see 
        // the next flashcard, wrap to the beginning.
        if (_currentDataCursor === (_currentDataLength - 1)  & direction === "next") {
          _currentDataCursor = 0;
        } else if (_currentDataCursor === 0 && direction === "prev") {
          // If they are at the start of the word list and want to see 
          // the previous flashcard, wrap to the end.
          _currentDataCursor = (_currentDataLength - 1);
        } else {
          if (direction === "next") {
            _currentDataCursor++;
          } else {
            _currentDataCursor--;
          }
        }
        
        // Populate the UI fields with new flashcard data.
        _jFlash.textContent = _currentData[_currentDataCursor][0];
        _fFlash.textContent = _currentData[_currentDataCursor][1];
        _rFlash.textContent = _currentData[_currentDataCursor][2];
        _eFlash.textContent = _currentData[_currentDataCursor][3];
        
        // Show the furigana if the Japanese is not the same as the furigana,
        // as we don't want to show the furigana in that case.
        if (_currentData[_currentDataCursor][0] !== _currentData[_currentDataCursor][1]) {
          _fFlash.style.visibility = "visible";          
        } else {
          _fFlash.style.visibility = "hidden";          
        }

        // Update the counter telling user where they are in the word list, 
        // for example card 1 of 357.
        _flashcardCounter.textContent = "card " + (_currentDataCursor + 1) + " of " + _currentDataLength;
      },

      // Wrap the request call in an immediate function so the httpRequest
      // object will be unique for each call, otherwise it could have
      // wrong data values due to how closures work.
      /**
       * @param options  - an object with properties that control the
       *                    type of content to be displayed. The template 
       *                    page html might also be passed in the options, 
       *                    and possibly also the data used to populate the template.
       *
       * Actually make an ajax request to get data.
       */
      makePageRequest: function (options) {
        (function(options) {
          var fullUrl, origin, httpRequest = new XMLHttpRequest();

          if (!httpRequest) {
            console.log('makePageRequest - cannot create an XMLHTTP instance');
            return false;
          }

          // Ensure required options are present.
          if(!PARAJP.validOptions(options)) {
            return false;
          }
          
          origin = (window.location.origin.indexOf('localhost') == -1) ? window.location.origin + '/japanese/' : window.location.origin + '/';
          
          fullUrl = origin + options.urlRoot + options.url + '?pseudoParam=' + new Date().getTime();

          httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
              if (httpRequest.status === 200) {
                // Add the ajax response data to the options passed
                // to the callback.
                options['callbackOptions']['data'] = httpRequest.responseText;
                options.callback(options['callbackOptions']);
              } else {
                console.log('makePageRequest - there was a problem with the request');
              }
            }
          };
          
          // Append current time in milliseconds from epoch to avoid caching.
          httpRequest.open('GET', fullUrl);
          httpRequest.setRequestHeader('Content-Type', options.contentType || 'text/plain');
          httpRequest.send();
        })(options)
      },

      /**
       * @param options  - an object with properties that control the
       *                    type of content to be displayed.
       */
      validOptions: function (options) {
        var isValid = true;

        if (options) {
          if (!options.hasOwnProperty('url') || 
              !options.hasOwnProperty('urlRoot') ||
              !options.hasOwnProperty('callback') || 
              !options.hasOwnProperty('callbackOptions')) {
            isValid = false;
            console.log('validOptions - options must have at least these options:\n' +
                          "\turl - name of file to retrieve\n" + 
                          "\turlRoot - root to be appended to url\n" + 
                          "\tcallback - function to call after request\n" +
                          "\tcallbackOptions - options used with the callback");
          }
        } else {
          isValid = false;
          console.log('validOptions - options missing');
        }
        return isValid;
      }
    };
  })())

})(typeof window === 'undefined' ? this : window );