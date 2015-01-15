'use strict';

/**
 * Binds a CodeMirror widget to a <textarea> element.
 */
angular.module('ui-codemirror-markdown', [])
  .constant('uiCodemirrorConfig', {})
  .directive('uiCodemirrorMarkdown', uiCodemirrorDirective);

/**
 * @ngInject
 */
function uiCodemirrorDirective($timeout, uiCodemirrorConfig) {

  return {
    restrict: 'EA',
    require: '?ngModel',
    compile: function compile() {

      // Require CodeMirror
      if (angular.isUndefined(window.CodeMirror)) {
        throw new Error('ui-codemirror-markdown need CodeMirror to work... (o rly?)');
      }

      //return postLink;
      return function(scope, iElement, iAttrs, ngModel){
          $timeout(function(){
              postLink(scope, iElement, iAttrs, ngModel);
          }, 100)
      }
    }
  };

  function postLink(scope, iElement, iAttrs, ngModel) {

    var codemirrorOptions = angular.extend(
      { value: iElement.text() },
      uiCodemirrorConfig.codemirror || {},
      scope.$eval(iAttrs.uiCodemirrorMarkdown),
      scope.$eval(iAttrs.uiCodemirrorOpts)
    );

    var mcu = new MyCodemirrorUI(iElement, codemirrorOptions);
    
    
    configOptionsWatcher(
	  mcu.codemirror,
      iAttrs.uiCodemirrorMarkdown || iAttrs.uiCodemirrorOpts,
      scope
    );

    configNgModelLink( mcu.codemirror, ngModel, scope );

    configUiRefreshAttribute( mcu.codemirror, iAttrs.uiRefresh, scope );

    // Allow access to the CodeMirror instance through a broadcasted event
    // eg: $broadcast('CodeMirror', function(cm){...});
    scope.$on('CodeMirror', function(event, callback) {
      if (angular.isFunction(callback)) {
        callback( mcu.codemirror);
      } else {
        throw new Error('the CodeMirror event requires a callback function');
      }
    });

    // onLoad callback
    if (angular.isFunction(codemirrorOptions.onLoad)) {
      codemirrorOptions.onLoad( mcu.codemirror );
    }
  }

  function configOptionsWatcher(codemirrot, uiCodemirrorAttr, scope) {
    if (!uiCodemirrorAttr) { return; }

    var codemirrorDefaultsKeys = Object.keys(window.CodeMirror.defaults);
    scope.$watch(uiCodemirrorAttr, updateOptions, true);
    function updateOptions(newValues, oldValue) {
      if (!angular.isObject(newValues)) { return; }
      codemirrorDefaultsKeys.forEach(function(key) {
        if (newValues.hasOwnProperty(key)) {

          if (oldValue && newValues[key] === oldValue[key]) {
            return;
          }

          codemirrot.setOption(key, newValues[key]);
        }
      });
    }
  }

  function configNgModelLink(codemirror, ngModel, scope) {
    if (!ngModel) { return; }
    // CodeMirror expects a string, so make sure it gets one.
    // This does not change the model.
    ngModel.$formatters.push(function(value) {
      if (angular.isUndefined(value) || value === null) {
        return '';
      } else if (angular.isObject(value) || angular.isArray(value)) {
        throw new Error('ui-codemirror cannot use an object or an array as a model');
      }
      return value;
    });


    // Override the ngModelController $render method, which is what gets called when the model is updated.
    // This takes care of the synchronizing the codeMirror element with the underlying model, in the case that it is changed by something else.
    ngModel.$render = function() {
      //Code mirror expects a string so make sure it gets one
      //Although the formatter have already done this, it can be possible that another formatter returns undefined (for example the required directive)
      var safeViewValue = ngModel.$viewValue || '';
      codemirror.setValue(safeViewValue);
    };
    
    ngModel.$render();


    // Keep the ngModel in sync with changes from CodeMirror
    codemirror.on('change', function(instance) {
      var newValue = instance.getValue();
      if (newValue !== ngModel.$viewValue) {
        scope.$applyAsync(function() {
          ngModel.$setViewValue(newValue);
        });
      }
    });
  }

  function configUiRefreshAttribute(codeMirror, uiRefreshAttr, scope) {
    if (!uiRefreshAttr) { return; }

    scope.$watch(uiRefreshAttr, function(newVal, oldVal) {
      // Skip the initial watch firing
      if (newVal !== oldVal) {
        $timeout(codeMirror.refresh);
      }
    });
  }

}
uiCodemirrorDirective.$inject = ["$timeout", "uiCodemirrorConfig"];


(function($){

if (!$) throw "jQuery is required but not available";
	
window.MyCodemirrorUI = function(iElement, codemirrorOptions){
	
	this.htmlRenderElement = null;	// html render element
    this.fullscreenContainer = null;	// fullscreen container
    this.codemirrorElement = null;	//codemirror element
    this.viewState = 0;

	this.initialize( iElement, codemirrorOptions );
}

/**
 * Create the table of contents object that
 * will be used as context for the template.
 *
 * @param  {String} `str`
 * @param  {Object} `options`
 * @return {Object}
 */
MyCodemirrorUI.utils = {
	arrayify: function(arr) {
	  return !Array.isArray(arr) ? [arr] : arr;
	},
	
	escapeRegex: function(re) {
	  return re.replace(/(\[|\]|\(|\)|\/|\.|\^|\$|\*|\+|\?)/g, '\\$1');
	},
	
	isMatch: function (keys, str) {
	  keys = this.arrayify(keys);
	  keys = (keys.length > 0) ? keys.join('|') : '.*';
	
	  // Escape certain characters, like '[', '('
	  var k = this.escapeRegex(String(keys));
	
	  // Build up the regex to use for replacement patterns
	  var re = new RegExp('(?:' + k + ')', 'g');
	  if (String(str).match(re)) {
	    return true;
	  } else {
	    return false;
	  }
	},
	
	slugify: function(text)
	{
	  return text.toString().toLowerCase()
	    .replace(/\s+/g, '-')           // Replace spaces with -
	    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
	    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
	    .replace(/^-+/, '')             // Trim - from start of text
	    .replace(/-+$/, '');            // Trim - from end of text
	},
	
	template: function(str, data, options) {
	  // Clone the data
	  data = _.extend({}, data);

	  //Defaults passed to 'delim' lib
	  var defaults = {body: '', beginning: '', end: '', flags: 'g'};
	  
	  // Delimiter options
	  var opts = _.extend({}, defaults, options);
	  var settings = _.extend({}, {variable: opts.variable}, opts.settings || {});
	  // Store a copy of the original string
	  var original = str;

	  // Look for templates to process until no more can be found
	  if (opts.delims) {
	    // Extend settings with custom delimiters
	    settings = _.extend({}, settings, delim(opts.delims, opts));
	    // Inspired by grunt.template
	    while (str.indexOf(opts.delims[0]) >= 0) {
	      str = _.template(str, data, settings);
	      if (str === original) {break;}
	    }
	  } else {
	    // If no custom delimiters are provided, use the defaults.
	    while (str.indexOf('${') >= 0 || str.indexOf('%>') >= 0) {
	      str = _.template(str, data, settings);
	      if (str === original) {break;}
	    }
	  }
	  return str;
	}

}

/**
 * default options
 */
MyCodemirrorUI.defaults = {
	lineWrapping : true,
    mode: 'gfm',
}


MyCodemirrorUI.prototype = {
	
	/**
	 * TODO
	 */
	initialize: function(iElement, codemirrorOptions){
		
		function escape(html, encode) {
		  return html
		    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
		    .replace(/</g, '&lt;')
		    .replace(/>/g, '&gt;')
		    .replace(/"/g, '&quot;')
		    .replace(/'/g, '&#39;');
		}
		
		/*
		 * Override marked's code render method
		 */
		var Renderer = function(){};
		Renderer.prototype = new window.marked.Renderer();
		Renderer.prototype.code = function(code, lang, escaped) {

		  if (this.options.highlight) {
		    var out = this.options.highlight(code, lang);
		    if (out != null && out !== code) {
		      escaped = true;
		      code = out;
		    }
		  }

		  if (!lang) {
		    return '<pre><code>'
		      + (escaped ? code : escape(code, true))
		      + '\n</code></pre>';
		  }

		  return '<pre><code class="'
		    + escape(lang, true)
		    + ' hljs">'
		    + (escaped ? code : escape(code, true))
		    + '\n</code></pre>\n';
		};
		
		// Because highlight.js is a bit awkward at times
	    var languageOverrides = {
	      js: 'javascript',
	      html: 'xml'
	    };
		
		window.marked.setOptions({
		  highlight: function (code, lang) {
			if(languageOverrides[lang]) lang = languageOverrides[lang];
		    return window.hljs.listLanguages().indexOf(lang) >= 0 ? window.hljs.highlight(lang, code).value : code;
		  }
		  , renderer: new Renderer()
		});
		
		var codemirrot;
		
		// extend options
		var codemirrorOptions = $.extend({}, MyCodemirrorUI.defaults, codemirrorOptions);
		
		iElement.addClass('ui-codemirror-markdown');
		
		if (iElement[0].tagName === 'TEXTAREA') {
	      // Might bug but still ... not support
	      codemirrot = window.CodeMirror.fromTextArea(iElement[0], codemirrorOptions);
	    } else {
	      /**/
	      //add element containing rendered html
	      var htmlRenderElement = angular.element( document.createElement('div') ).addClass('Codemirror-render-html');
	      var fullscreenContainer = angular.element( document.createElement('div') ).addClass('Codemirror-fullscreen normal');
	    	
	      iElement.html('');
	      var t = this;
	      codemirrot = new window.CodeMirror(function(cm_el) {
	    	iElement.append(fullscreenContainer);
	    	fullscreenContainer.append(cm_el);	//50%
	    	fullscreenContainer.append(htmlRenderElement); //50%
	    	t.codemirrorElement = cm_el;
	      }, codemirrorOptions);
	      
	      this.htmlRenderElement = htmlRenderElement;
	      this.fullscreenContainer = fullscreenContainer;
	      
	      if ( codemirrorOptions.toolbarContainer ){
	    	var toolbarContainer = codemirrorOptions.toolbarContainer;
		    if ( typeof(toolbarContainer) === 'string' ){
		    	toolbarContainer = $( toolbarContainer );
			}
		    fullscreenContainer.prepend( toolbarContainer );
	      	this.initEditorButton( toolbarContainer );
	      }
	    }
		
		if ( codemirrorOptions.tocContainer && typeof(codemirrorOptions.tocContainer) === 'string' ){
			this.tocEle = $( codemirrorOptions.tocContainer );
		}
		
		//update markdown preview
		var t = this;
		codemirrot.on("change", function(cm, chobj) {
		  
		  t.htmlRenderElement.html( window.marked( cm.getValue() ) );
		  if (t.tocEle) t.tocEle.html( window.marked( t.generateTocMD() ) );//TODO
		});
		
		this.codemirror = codemirrot;
		
		window.codemirror = codemirrot; //debug
		
		if (codemirrorOptions.initValue) codemirrot.setValue( codemirrorOptions.initValue );
		
		//editor height fit window
		/*var editorH = $(".CodeMirror-scroll").height();
		var fitH = $(window).height() - $(".CodeMirror-scroll").offset().top;
		if (editorH < fitH) $(".CodeMirror-scroll").height(fitH);
		
		codemirrot.refresh();*/
	},
		
	/**
	 * 
	 */
	initEditorButton: function( toolbarContainer ){
		
		if ( typeof(toolbarContainer) === 'string' ){
			toolbarContainer = $( toolbarContainer );
		}

		var t = this;
		$( toolbarContainer ).find( "[data-editorbtn]" ).click(function(e){
			console.log( e.target );
			t.applyEditorFunc( $(this).data('editorbtn') );
		})
		
		$( toolbarContainer ).click(function(e){
			console.log( e.target );
			//t.applyEditorFunc( $(this).data('editorbtn') );
		})
		
	},
	
	/**
	 * 
	 */
	applyEditorFunc: function( funcstr ){
		var codemirror = this.codemirror;
		var curPos = codemirror.getCursor();
		var linehandle = codemirror.getLineHandle(curPos.line);
		var selectedText = codemirror.getSelection(); 
		console.log( linehandle );
		var t = this;
		var functions = {
			'h1': function(){
				var linetext = codemirror.getLine(curPos.line);
				var i = 0;
				while (linetext[i] === '#' || linetext[i] === ' ') i ++;
				//codemirror.setCursor( {'line': curPos.line, 'ch': 0} );
				codemirror.setSelection( {'line': curPos.line, 'ch': 0}, {'line': curPos.line, 'ch': i})
				codemirror.replaceSelection('# ', 'around');
			},
			'heading': function(level){
				// select to clear the current heading
				var linetext = codemirror.getLine(curPos.line);
				var i = 0;
				while (linetext[i] === '#' || linetext[i] === ' ') i ++;
				codemirror.setSelection( {'line': curPos.line, 'ch': 0}, {'line': curPos.line, 'ch': i})
				
				// new heading mark
				var hdmark = '';
				for (i = 0; i < level; i ++) hdmark += '#';
				codemirror.replaceSelection( hdmark, 'around');
			},
			'bold': function(){
				codemirror.replaceSelection( '**' + (selectedText !== '' ? selectedText : 'Strong Text') + '**' , 'around' );
			},
			'italic': function(){
				codemirror.replaceSelection( '*' + (selectedText !== '' ? selectedText : 'Italic Text') + '*' , 'around' );
			},
			'strikethrough': function(){
				var replaceText = '~~' + (selectedText !== '' ? selectedText : 'Strikethrough Text') + '~~';
				codemirror.replaceSelection( replaceText, 'around' );
				//codemirror.setSelection({'line': , 'ch'}, {})
			},
			'link': function(){
				var replaceText = '[marked](https://github.com/chjj)';
				codemirror.replaceSelection( replaceText, 'around' );
			},
			'image': function(){
				var replaceText = '![Alt text](http://leonardgoldenson.tv/Welcome_files/abc.jpg "Optional title")';
				codemirror.replaceSelection( replaceText, 'around' );
			},
			'undo': function(){
				codemirror.undo();
			},
			'redo': function(){
				codemirror.redo();
			},
			'list': function(){
				var listsamplesyntax = ' - 1\n'
						+ ' - 2\n'
						+ ' - 3\n';
				
				codemirror.replaceSelection( listsamplesyntax , 'around' );
			},
			'table': function(){
				var tblsamplesyntax = 'Item     | Value\n'
						+ '-------- | ---\n'
						+ 'Computer | $1600\n'
						+ 'Phone    | $12\n'
						+ 'Pipe     | $1\n';
				
				codemirror.replaceSelection( tblsamplesyntax , 'around' );
			},
			'eye': function(){
				if (!t.viewState){
					t.viewState = 0;
				}
				
				var viewState = t.viewState
				viewState = viewState == 2 ? 0: viewState + 1;
				t.updateViewState( viewState );
				t.generateTocMD();
			},
			'fullscreen': function(){
				if ( t.fullscreenContainer.hasClass('normal') ){
					t.fullscreenContainer.removeClass('normal');
					t.fullscreenContainer.addClass('fullscreen');
					return;
				}
				t.fullscreenContainer.addClass('normal');
				t.fullscreenContainer.removeClass('fullscreen');
			}
		}
		
		if (funcstr.match(/^h[1-6]$/)){
			functions.heading( parseInt( funcstr[1] ) );
		}
		if ( functions[ funcstr ] ){
			functions[ funcstr ]();
		}
	},
	
	/**
	 * viewState: 0 1 2
	 */
	updateViewState: function( viewState ){

		var codemirror = this.codemirror;
		
		switch (viewState) {
		case 0:
			$( codemirror.getScrollerElement() ).parent().show();
			$( codemirror.getScrollerElement() ).parent().css('width', '50%');
			this.htmlRenderElement.css('width', '50%');
			break;
			
		case 1:
			$( codemirror.getScrollerElement() ).parent().css('width', '100%');
			this.htmlRenderElement.hide();
			break;
			
		case 2:
			$( codemirror.getScrollerElement() ).parent().hide();
			this.htmlRenderElement.show();
			this.htmlRenderElement.css('width', '100%');
			break;
				
		default:
			break;
		}
		
		this.viewState = viewState;
	},
	
	/**
	 * 
	 * @param options
	 */
	generate: function( options ) {
	  var defaultTemplate = '<%= depth %><%= bullet %>[<%= heading %>](#<%= url %>)\n';
	  var str = this.codemirror.getValue();
	  var opts = _.extend({
	    firsth1: false,
	    blacklist: true,
	    omit: [],
	    maxDepth: 3,
	    slugifyOptions: { allowedChars: '-' },
	    slugify: function(text) {
	      return MyCodemirrorUI.utils.slugify(text, opts.slugifyOptions);
	    }
	  }, options);

	  var toc = '';
	  var tokens = marked.lexer(str);
	  var tocArray = [];

	  // Remove the very first h1, true by default
	  if(opts.firsth1 === false) {
	    tokens.shift();
	  }

	  // Do any h1's still exist?
	  var h1 = _.any(tokens, {depth: 1});

	  tokens.filter(function (token) {
	    // Filter out everything but headings
	    if (token.type !== 'heading' || token.type === 'code') {
	      return false;
	    }

	    // Since we removed the first h1, we'll check to see if other h1's
	    // exist. If none exist, then we unindent the rest of the TOC
	    if(!h1) {
	      token.depth = token.depth - 1;
	    }

	    // Store original text and create an id for linking
	    token.heading = opts.clean ? MyCodemirrorUI.utils.clean(token.text, opts) : token.text;

	    // Create a "slugified" id for linking
	    token.id = opts.slugify(token.text);

	    // Omit headings with these strings
	    var omissions = ['Table of Contents', 'TOC', 'TABLE OF CONTENTS'];
	    var omit = _.union([], opts.omit, omissions);

	    if (MyCodemirrorUI.utils.isMatch(omit, token.heading)) {
	      return;
	    }

	    return true;
	  }).forEach(function (h) {

	    if(h.depth > opts.maxDepth) {
	      return;
	    }

	    var bullet = Array.isArray(opts.bullet) ? opts.bullet[(h.depth - 1) % opts.bullet.length] : opts.bullet;

	    var data = _.extend({}, opts.data, {
	      depth  : new Array((h.depth - 1) * 2 + 1).join(' '),
	      bullet : bullet ? bullet : '* ',
	      heading: h.heading,
	      url    : h.id
	    });

	    tocArray.push(data);

	    var tmpl = opts.template || defaultTemplate;
	    toc += MyCodemirrorUI.utils.template(tmpl, data);
	  });

	  return {
	    data: tocArray,
	    toc: opts.clean ? MyCodemirrorUI.utils.clean(toc, opts) : toc
	  };
	},
	
	/**
	 * 
	 */
	generateTocMD: function(){
		console.log( this.generate().toc );
		return this.generate().toc;
	}

}
	
})(jQuery);

/**
 * Dang Thanh Tung
 */

function initEditorButton(codemirror, toolbarContainer){}

function applyEditorFunc(codemirror, funcstr){}

/**
 * viewState: 0 1 2
 */
function updateState(codemirror, viewState){}




function generate(str, options) {
  var opts = _.extend({
    firsth1: false,
    blacklist: true,
    omit: [],
    maxDepth: 3,
    slugifyOptions: { allowedChars: '-' },
    slugify: function(text) {
      return slugify(text, opts.slugifyOptions);
    }
  }, options);

  var toc = '';
  var tokens = marked.lexer(str);
  var tocArray = [];

  // Remove the very first h1, true by default
  if(opts.firsth1 === false) {
    tokens.shift();
  }

  // Do any h1's still exist?
  var h1 = _.any(tokens, {depth: 1});

  tokens.filter(function (token) {
    // Filter out everything but headings
    if (token.type !== 'heading' || token.type === 'code') {
      return false;
    }

    // Since we removed the first h1, we'll check to see if other h1's
    // exist. If none exist, then we unindent the rest of the TOC
    if(!h1) {
      token.depth = token.depth - 1;
    }

    // Store original text and create an id for linking
    token.heading = opts.clean ? utils.clean(token.text, opts) : token.text;

    // Create a "slugified" id for linking
    token.id = opts.slugify(token.text);

    // Omit headings with these strings
    var omissions = ['Table of Contents', 'TOC', 'TABLE OF CONTENTS'];
    var omit = _.union([], opts.omit, omissions);

    if (utils.isMatch(omit, token.heading)) {
      return;
    }

    return true;
  }).forEach(function (h) {

    if(h.depth > opts.maxDepth) {
      return;
    }

    var bullet = Array.isArray(opts.bullet) ? opts.bullet[(h.depth - 1) % opts.bullet.length] : opts.bullet;

    var data = _.extend({}, opts.data, {
      depth  : new Array((h.depth - 1) * 2 + 1).join(' '),
      bullet : bullet ? bullet : '* ',
      heading: h.heading,
      url    : h.id
    });

    tocArray.push(data);

    var tmpl = opts.template || defaultTemplate;
    toc += template(tmpl, data);
  });

  return {
    data: tocArray,
    toc: opts.clean ? utils.clean(toc, opts) : toc
  };
}
