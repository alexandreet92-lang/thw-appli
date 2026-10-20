exports.useI18n = function () { var l = 'fr'; try { l = localStorage.getItem('thw-lang') || 'fr' } catch (e) {} return { lang: l, t: function (k) { return k } } }
