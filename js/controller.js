angular.module('MyModule', ['ui-codemirror-markdown'])
	.controller('MyController', ['$scope', controller]);

function controller($scope){
	$scope.content = "#This is Codemirror Markdown Angular directive";
	$scope.editorOptions = {
		lineNumbers: false
    };
	
	console.log("abcd");
}