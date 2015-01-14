This script combines some script i found on internet, using popular libraries such as [marked](https://github.com/chjj), 
[codemirror](http://codemirror.net/), [highlightjs](https://highlightjs.org/), [lodash](https://lodash.com/) to provide a simple instant 
translate [markdown](https://help.github.com/articles/markdown-basics/) syntax to HTML **Editor**, it also provide angular directive option with 2 ways data binding.

#Features
 - Instant translation from markdown to HTML.
 - Angular directive with 2 ways data binding.
 - Toolbar buttons self designed independently
 - Auto generate Table of Contens

<!--more-->
#Acknowledgement 
 - [Marked](https://github.com/chjj), [Codemirror](http://codemirror.net/), [Highlightjs](https://highlightjs.org/) for great javascript library tools
 - [Markdown Editor](http://jbt.github.io/markdown-editor/) for codemirror - markdown solution
 - [Ui-codemirror](https://github.com/angular-ui/ui-codemirror) for angular - codemirror directive solution


#Normal use
##Pre install
Basically include these *Css* & *Javascript* libaries 
```html
<script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.3.8/angular.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/0.3.2/marked.min.js"></script>

<!-- Codemirror stuffs, and highlight -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.10.0/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/default.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.10.0/codemirror.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.10.0/addon/mode/overlay.min.js"></script> 
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.10.0/mode/markdown/markdown.min.js"></script> 
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/4.10.0/mode/gfm/gfm.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>
```

And then codemirror-markdown-editor javascript and css files

```html
<!-- ui-codemirror-markdown-editor -->
<link rel="stylesheet" href="css/ui-codemirror-markdown-editor.css" />
<script src="js/ui-codemirror-markdown-editor.js"></script>
```

Basic usage is pretty simple
```html
<div id="codemirror-markdown-editor"></div>

<script type="text/javascript">
$(document).ready(function(){
	var codemirrorOptions = {};
	new MyCodemirrorUI( $('#codemirror-markdown-editor'), codemirrorOptions )
})
</script>
```

Angular directive use
```html
<div class="row" ng-model="content" ui-codemirror-markdown="editorOptions"></div>
```

See [Demo](http://dttungsyn.github.io/angular-ui-cm-markdown-editor) here