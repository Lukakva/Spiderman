# Intializing

Download the .zip file from GitHub, extract it and import the .js file in your HTML file.

```html
<script src="path/to/spiderman-game.js"></script>
<script type="text/javascript">

var game = new SpidermanGame({
    canvas: "canvas", // canvas selector
    muted: false, // if true, the music will be muted
    soundEffects: true, // if false, sound effects will be muted
    score: 0, // initial score
});

// start loading the resources
game.load();

</script>
```

## Note
Keep in mind that spiderman-game.js script loads resources from same directory, if you move the script file somewhere else, please change the ``RESOURCES_FOLDER_PATH`` variable to relative, or absolute path to where the resources are located.