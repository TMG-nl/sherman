/**
 * Insert text at the caret / selection position in a textarea / input element.
 *
 * Will insert text in the textarea / input element at the position of the caret
 * or will overwrite the text at the selection. Will also focus the elenent.
 *
 * @link http://stackoverflow.com/questions/946534/insert-text-into-textarea-with-jquery
 */
jQuery.fn.extend({
    insertAtCaret: function(text) {
        return this.each(function(i) {
            var hasSelectionStart;
            try {
                hasSelectionStart = typeof(this.selectionStart) !== "undefined";
            } catch(e) {
                hasSelectionStart = false;
            }

            if (document.selection) {
                /*
                 * For browsers like Internet Explorer
                 */
                this.focus();
                var sel = document.selection.createRange();
                sel.text = text;
                this.focus();
            } else if (hasSelectionStart) {
                //For browsers like Firefox and Webkit based
                var startPos  = this.selectionStart;
                var endPos    = this.selectionEnd;
                var scrollTop = this.scrollTop;
                this.value    = this.value.substring(0, startPos)+text+this.value.substring(endPos,this.value.length);
                this.focus();
                this.selectionStart = startPos + text.length;
                this.selectionEnd = startPos + text.length;
                this.scrollTop = scrollTop;
            } else {
                this.value += text;
                this.focus();
            }
      });
    }
});