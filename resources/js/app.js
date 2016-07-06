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
  global.JAPANESE = global.JAPANESE || (global.JAPANESE = (function () {
    // private members within the JAPANESE namespace
    // IMPORTANT - refer to these private variables in the code without "this." 
    //               or "JAPANESE." because if you use them you won't get
    //               the private variable.
    
    // The app version.
    var _version = "1.0.0";
    
    // main content container where we typically add content
    var _pageContent;
    
    var _flashCards = [];
    var _flashCardsLength = 0;
    var _flashCardsCursor = 0;
    var _jFlash = null;
    var _fFlash = null;
    var _eFlash = null;
    var _flashcardCounter = null;

    // public interface to DYNAMIC_LAYOUT
    return {
      // return the framework version
      getVersion: function () {
        return _version;
      },
      
      // onload event handler for application initialization and setup
      initApp: function () {
        // One value proposition centers around dynamic layout, and one
        // way this is fired off is with browser resizing.
        this.setEventListeners();   
        
        // Get and store a reference to the main content container.
        _pageContent = document.getElementById('page-content');
        
      },
      
      setEventListeners: function () {
        this.addEvent(document.getElementById('japaneseOtherSitesSelect'), "change", this.otherSitesListener);        
      },

      otherSitesListener: function (event) {
        var url = '';

        switch(event.target.value) {
          case 'javascript':
            url = 'http://www.paragonica.com/index.html';
            break;
          case 'dashboard':
            url = 'http://www.paragonica.com/dashboard';
            break;
          case 'flight':
            url = 'http://www.paragonica.com/flightSimulator';
            break;
        }
        if (url) {
          window.open(url, '_blank');
        }
        event.target.value = 'other Paragonica sites';
      },


      // Safely add an event listener, rather than wipe out an existing
      // listener with something like onresize="blahblah()"
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
      
      // Get the content for a page and place it in the page-content container.
      showPage: function (id) {
        var data, callback = this.processPage;

        _pageContent.style.display = "none";
        _pageContent.innerHTML = "";

        if (id) {
          if (id.search('flashcards') >=0 ) {
            callback = this.getFlashcards;
          }
          this.makePageRequest({
            url: id,
            callback: callback,
            contentType: 'text/html'
          });
        } else {
          console.log('showPage - example id missing');
        }
      },
      
      getFlashcards: function (data) {
        _pageContent.innerHTML = data;
        JAPANESE.makePageRequest({
            url: '../data/JapaneseComputingVocab.txt',
            callback: JAPANESE.processFlashcards,
            contentType: 'text/plain'
          });
      },
      
      processFlashcards: function (data) {
        // naive approach for now, putting all items in memory,
        // later use a database to get flashcards one set at a time
        var items = [], idx, len, curr;
        
        items = data.split('\n');
        len = items.length;
        _flashCardsLength = items.length - 1;  // set to length - 1 to ignore header in data
        
        // start at index 1 to ignore header in data
        for (idx = 1;idx < len;idx++) {
          curr = items[idx].split('\t');
          _flashCards.push([curr[0].replace(/"/g, ''), curr[1].replace(/"/g, ''), curr[2].replace(/"/g, '')]);
        }
        
        _jFlash = document.getElementById('jFlash'); 
        _fFlash = document.getElementById('fFlash'); 
        _eFlash = document.getElementById('eFlash'); 
        _flashcardCounter = document.getElementById('flashcard-counter');
        
        _jFlash.textContent = _flashCards[_flashCardsCursor][0];
        _fFlash.textContent = _flashCards[_flashCardsCursor][1];
        _eFlash.textContent = _flashCards[_flashCardsCursor][2];        
        
        _jFlash.style.visibility = "visible";
        
        if (_flashCards[_flashCardsCursor][0] !== _flashCards[_flashCardsCursor][1]) {
          _fFlash.style.visibility = "visible";          
        } else {
          _fFlash.style.visibility = "hidden";          
        }
        
        _flashcardCounter.textContent = "card 1 of " + _flashCardsLength;
        _pageContent.style.display = "block";
      },
      
      showEnglish: function () {
        _eFlash.style.visibility = "visible";
      },
      
      moveFlashCard: function (dir) {
        _eFlash.style.visibility = "hidden";
        _fFlash.style.visibility = "hidden";    
        
        if (_flashCardsCursor === (_flashCardsLength - 1)  & dir === "next") {
          _flashCardsCursor = 0;
        } else if (_flashCardsCursor === 0 && dir === "prev") {
          _flashCardsCursor = (_flashCardsLength - 1);
        } else {
          if (dir === "next") {
            _flashCardsCursor++;
          } else {
            _flashCardsCursor--;
          }
        }
        
        _jFlash.textContent = _flashCards[_flashCardsCursor][0];
        _fFlash.textContent = _flashCards[_flashCardsCursor][1];
        _eFlash.textContent = _flashCards[_flashCardsCursor][2];
        
        if (_flashCards[_flashCardsCursor][0] !== _flashCards[_flashCardsCursor][1]) {
          _fFlash.style.visibility = "visible";          
        } else {
          _fFlash.style.visibility = "hidden";          
        }

        _flashcardCounter.textContent = "card " + (_flashCardsCursor + 1) + " of " + _flashCardsLength;
      },

      processPage: function (data) {
        _pageContent.innerHTML = data;
        _pageContent.style.display = "block";
      },

      // Wrap the request call in an immediate function so the httpRequest
      // object will be unique for each call, otherwise it could have
      // wrong data values due to how closures work.
      makePageRequest: function (options) {
        (function(options) {
          var httpRequest = new XMLHttpRequest();

          if (!httpRequest) {
            console.log('makePageRequest - cannot create an XMLHTTP instance');
            return false;
          }

          if(!JAPANESE.validOptions(options)) {
            return false;
          }

          httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
              if (httpRequest.status === 200) {
                options.callback(httpRequest.responseText);
              } else {
                console.log('makePageRequest - there was a problem with the request');
              }
            }
          };
          
          httpRequest.open('GET', 'resources/pages/' + options.url + '?pseudoParam=' + new Date().getTime());
          httpRequest.setRequestHeader('Content-Type', options.contentType || 'text/plain');
          httpRequest.send();
        })(options)
      },

      validOptions: function (options) {
        var isValid = true;

        if (options) {
          if (!options.hasOwnProperty('url') || !options.hasOwnProperty('callback')) {
            isValid = false;
            console.log('validOptions - options must have at least these options:\n' +
            "\turl - name of file to retrieve\n\tcallback - function to call after request");
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