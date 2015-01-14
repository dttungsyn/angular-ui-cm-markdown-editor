angular.module('MyModule', ['ui-codemirror-markdown'])
	.controller('MyController', ['$scope', controller]);

function controller($scope){
	$scope.content = "#This is codemirror";
	$scope.editorOptions = {
		lineNumbers: false
    };
	
	console.log("abcd");
}