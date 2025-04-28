let sunapiBasket = function(params = {}) {
    let _this = this,
        defaults = {
            setup: {
                open_basket_without_adding_on_add_to_basket_action: false,
                path_to_order: '',
                checkout_btn_classname: '',
            },
            classes: {
                add_to_basket: '.js-add-to-basket',
                add_to_basket_set: '.js-add-to-basket-set',
                open_basket: '.js-open-basket',

                basket_line_counter: '.js-basket-line-items-counter',
                basket_line_sum: '.js-basket-line-items-sum',

                wrapper: '.js-product-basket',
                popup: '.js-basket-popup',
                header: '.js-basket-popup-header',
                content: '.js-basket-popup-content',
                list: '.js-basket-popup-list',
                discountCompleted: '.basket-info__minimal-text.completed',
                discountNotCompleted: '.basket-info__minimal-text.not-completed',
                discountLine: '.basket-info__minimal-bar__full',
                discountSumLeft: '.basket-info__minimal-text__amount',
                discountSumIcon: '.basket-info__minimal-icon',
                discountSumIconSpan: '.basket-info__minimal-icon span',
                preloader: '.js-basket-popup-loading',
                notEnoughSum: '.js-basket-not-enough-sum',
                footer: '.js-basket-popup-footer',
                close: '.js-close-basket-popup',
                checkout: '.js-basket-popup-checkout',

                item: '.js-basket-item',
                item_link_wrapper: '.basket-item-title',
                item_remove: '.js-basket-item-remove',
                item_quantity_minus: '.js-quantity-minus',
                item_quantity_plus: '.js-quantity-plus',
                item_quantity_current: '.js-quantity-current',
            }
        };

    this.doc = $(document);
    this.body = $('body');

    this.el = {};
    this.basket = {};
    this.timeouts = {};
    this.ajax_delay = 500;
    this.initialized = false;
    this.opened = false;

    this.p = {
        setup: $.extend(defaults.setup, params.setup),
        classes: $.extend(defaults.classes, params.classes),
    };

    this.doc
        .ready(function() {
            if(!_this.initialized) {
                _this.init();
            }
        })
        .on('click', this.p.classes.add_to_basket, function(e) {
            e.preventDefault();
            e.stopPropagation();

            // debugger;

            /*if (checkCounters()) {
                console.log('a');

                let btn = $(this),
                    id = parseInt(btn.data('item')) || 0;

                addBasketCounter(id);
            }*/

            if (_this.p.setup.open_basket_without_adding_on_add_to_basket_action) {
                _this.showBasket(200);
            }
            else {
                let btn = $(this),
                    id = parseInt(btn.data('id')) || parseInt(btn.data('item')) || 0,
                    quantity = parseFloat(btn.data('quantity')) || 1;

                _this.addToBasket(id, quantity);
            }
        })
        .on('click', this.p.classes.add_to_basket_set, function(e) {
            e.preventDefault();
            e.stopPropagation();

            // debugger;

            let btn = $(this),
                id = parseInt(btn.data('id')) || 0,
                quantity = parseInt(btn.data('set-quantity')) || 1;

            _this.addToBasket(id, quantity);
        })
        .on('click', this.p.classes.checkout, function(e) {
            e.preventDefault();

            if (checkCounters('google')) {
                checkoutCounter(1, 'start order');
            }

            if (_this.p.setup.path_to_order.length) {
                location.href = _this.p.setup.path_to_order;
            }
        })
        .on('click', [this.p.classes.close, this.p.classes.wrapper].join(', '), function(e) {
            // debugger;

            if(_this.opened) {
                let target = $(e.target);

                if (!target.closest(_this.p.classes.item_link_wrapper).length) {
                    e.preventDefault();
                }

                if((_this.el.wrapper.is(e.target) && _this.el.popup.has(e.target).length === 0) ||
                    target.hasClass(_this.p.classes.close.replace('.', '')) || target.closest(_this.p.classes.close).length > 0) {
                    _this.doc.trigger('CloseBasket');
                }
            }
        })
        .on('click', [this.p.classes.item_quantity_minus, this.p.classes.item_quantity_plus].join(', '), function(e) {
            // debugger;

            if(_this.opened) {
                e.preventDefault();

                let target = $(e.target),
                    btn = target.hasClass(_this.p.classes.item_quantity_minus) || target.hasClass(_this.p.classes.item_quantity_plus) ? target : target.closest([_this.p.classes.item_quantity_minus, _this.p.classes.item_quantity_plus].join(', '));

                if(btn.hasClass('disabled'))
                    return;

                _this.changeBasketItemQuantity(btn);
                BX.onCustomEvent('OnBasketChange');
            }
        })
        .on('click', this.p.classes.item_remove, function(e) {
            if(_this.opened) {
                _this.deleteBasketItem($(this));
            }
        })
        .on('click', this.p.classes.open_basket, function(e) {
            e.preventDefault();

            if(_this.initialized) {
                _this.showBasket();
            }
        })
        .on('change', this.p.classes.item_quantity_current, function(e) {
            if(_this.opened) {
                _this.changeBasketItemQuantity($(this));
            }
        })
        .on('keyup', function(e) {
            if(e.which === 27 && _this.opened) {
                _this.doc.trigger('CloseBasket');
            }
        })
        .on('addToBasketProduct', function(e, id = 0, q = 0) {
            _this.addToBasket(id, q);
        })
        .on('ShowBasket', function() {
            if(_this.initialized) {
                _this.showBasket();
            }
        })
        .on('CloseBasket', function() {
            if(_this.opened) {
                _this.closeBasket();
            }
        })
        .on('RefreshBasket', function(e) {
            if(_this.opened) {
                _this.getContent();
                BX.onCustomEvent('OnBasketChange');
            }
        })
        .on('RefreshBasketProductQuantity', function(e) {
            _this.getContent();
        })
        .on('GetBasketContent', function() {
            if(_this.opened) {
                _this.getContent();
            }
        })
        .on('OnAfterContentRefresh', function() {
            if(_this.opened) {
                _this.verifyItems();
                _this.initCheckout();
                _this.initBasketPopupCheckoutBtn();
                _this.calculateAdditionalDiscountLine();
            }
        });
}
sunapiBasket.prototype.init = function() {
    let _this = this;

    this.initialized = this.initContentEl() &&
        this.initCloseEl() &&
        this.initPopupEl() &&
        this.initListEl() &&
        // this.initNotEnoughEl() &&
        this.initFooterEl() &&
        this.initHeaderEl() &&
        this.initWrapperEl();

    if(this.initialized) {
        this.initBasketLineItemsCounter();
        this.initBasketLineItemsSum();

        this.el.list.scroll(function() {
            _this.listScrollHandler();
        });
    }
}
sunapiBasket.prototype.initCheckout = function() {
    this.el.checkout = [];
    if(typeof this.p.classes.checkout == 'string' && this.p.classes.checkout.length)
        this.el.checkout = $(this.p.classes.checkout);
    return this.el.checkout.length > 0;
}
sunapiBasket.prototype.initBasketPopupCheckoutBtn = function() {
    if (this.el.checkout.length) {
        this.el.checkout.addClass(this.p.setup.checkout_btn_classname);
    }
}
sunapiBasket.prototype.initBasketLineItemsCounter = function() {
    this.el.basket_line_counter = [];
    if(typeof this.p.classes.basket_line_counter == 'string' && this.p.classes.basket_line_counter.length)
        this.el.basket_line_counter = $(this.p.classes.basket_line_counter);
    return this.el.basket_line_counter.length > 0;
}
sunapiBasket.prototype.initBasketLineItemsSum = function() {
    this.el.basket_line_sum = [];
    if(typeof this.p.classes.basket_line_sum == 'string' && this.p.classes.basket_line_sum.length)
        this.el.basket_line_sum = $(this.p.classes.basket_line_sum);
    return this.el.basket_line_sum.length > 0;
}
sunapiBasket.prototype.initWrapperEl = function() {
    this.el.wrapper = [];
    if(typeof this.p.classes.wrapper == 'string' && this.p.classes.wrapper.length)
        this.el.wrapper = $(this.p.classes.wrapper);
    return this.el.wrapper.length > 0;
}
sunapiBasket.prototype.initPopupEl = function() {
    this.el.popup = [];
    if(typeof this.p.classes.popup == 'string' && this.p.classes.popup.length)
        this.el.popup = $(this.p.classes.popup);
    return this.el.popup.length > 0;
}
sunapiBasket.prototype.initListEl = function() {
    this.el.list = [];
    if(typeof this.p.classes.list == 'string' && this.p.classes.list.length)
        this.el.list = $(this.p.classes.list);
    return this.el.list.length > 0;
}
sunapiBasket.prototype.initCloseEl = function() {
    this.el.close = [];
    if(typeof this.p.classes.close == 'string' && this.p.classes.close.length)
        this.el.close = $(this.p.classes.close);
    return this.el.close.length > 0;
}
sunapiBasket.prototype.initContentEl = function() {
    this.el.content = [];
    if(typeof this.p.classes.content == 'string' && this.p.classes.content.length)
        this.el.content = $(this.p.classes.content);
    return this.el.content.length > 0;
}
sunapiBasket.prototype.initNotEnoughEl = function() {
    this.el.notEnoughSection = [];
    if(typeof this.p.classes.notEnoughSum == 'string' && this.p.classes.notEnoughSum.length)
        this.el.notEnoughSection = $(this.p.classes.notEnoughSum);
    return this.el.notEnoughSection.length > 0;
}
sunapiBasket.prototype.initFooterEl = function() {
    this.el.footer = [];
    if(typeof this.p.classes.footer == 'string' && this.p.classes.footer.length)
        this.el.footer = $(this.p.classes.footer);
    return this.el.footer.length > 0;
}
sunapiBasket.prototype.initHeaderEl = function() {
    this.el.header = [];
    if(typeof this.p.classes.header == 'string' && this.p.classes.header.length)
        this.el.header = $(this.p.classes.header);
    return this.el.header.length > 0;
}
sunapiBasket.prototype.initItemsEl = function() {
    this.el.item = [];
    if(typeof this.p.classes.item == 'string' && this.p.classes.item.length)
        this.el.item = $(this.p.classes.item);
    return this.el.item.length > 0;
}
sunapiBasket.prototype.initPreloaderEl = function() {
    this.el.preloader = [];
    if(typeof this.p.classes.preloader == 'string' && this.p.classes.preloader.length)
        this.el.preloader = $(this.p.classes.preloader);
    return this.el.preloader.length > 0;
}
sunapiBasket.prototype.verifyItems = function() {
    if(this.initItemsEl()) {
        let _this = this;

        this.el.item.each(function() {
            let item = $(this),
                basketItemId = parseInt(item.data('id')) || 0;

            if(typeof _this.basket.items[basketItemId] == 'object') {
                _this.basket.items[basketItemId].el = item;

                _this.verifyBasketItemQuantityField(item);
            }
        });
    }
}
sunapiBasket.prototype.verifyBasketItemQuantityField = function(item = [], action = false) {
    let result = {};

    if(item.length) {
        let itemBasketId = parseInt(item.data('id')) || 0,
            obItem = itemBasketId > 0 ? this.basket.items[itemBasketId] : false,
            input = item.find(this.p.classes.item_quantity_current),
            measureRatio = parseInt(input[0].dataset['measure_ratio']),
            minusBtn = item.find(this.p.classes.item_quantity_minus),
            plusBtn = item.find(this.p.classes.item_quantity_plus),
            currentQ = parseInt(input.val()) || 0,
            maxQ = obItem ? obItem.max_quantity : 0;

        if(action == 'minus') {
            currentQ -= measureRatio;
        }
        else if(action == 'plus') {
            currentQ += measureRatio;
        }
        else {
            if (measureRatio !== 1) {
                let precisionFactor = Math.pow(10, 6);
                let remain = (currentQ * precisionFactor) % (measureRatio * precisionFactor) / precisionFactor;

                if (measureRatio > 0 && remain > 0) {
                    if (
                        remain >= measureRatio / 2
                        && (
                            maxQ === 0
                            || (currentQ + measureRatio - remain) <= maxQ
                        )
                    ) {
                        currentQ += (measureRatio - remain);
                    }
                    else {
                        currentQ -= remain;
                    }
                }
            }
        }

        if(currentQ > maxQ && maxQ > 0) {
            currentQ = maxQ;
        }

        if(currentQ < 1) {
            currentQ = measureRatio;
        }

        if(currentQ == maxQ) {
            plusBtn.addClass('disabled');
        }
        else if(currentQ > 0 && currentQ < maxQ) {
            plusBtn.removeClass('disabled');
        }

        if(currentQ == 1) {
            minusBtn.addClass('disabled');
        }
        else if(currentQ > 1) {
            minusBtn.removeClass('disabled');
        }

        input.val(currentQ);

        if(obItem.quantity !== currentQ) {
            result.id = itemBasketId;
            result.quantity = currentQ;
        }
    }

    return result;
}
sunapiBasket.prototype.addToBasket = function(id = 0, quantity = 1) {
    if (id > 0) {
        let _this = this;

        quantity = parseInt(quantity);

        this.makeAjaxAction('addToBasket', {id: id, quantity: quantity}, function(content) {
            if (content.status) {
                // Facebook Pixel AddToCart event handler
                if (1 == 11 && typeof fbq == 'function' && content.product) {
                    try {
                        let fbqData = {
                            content_name: content.product.name,
                            content_ids: [content.product.id],
                            content_type: 'product',
                            num_items: quantity,
                            value: content.product.price,
                            currency: content.product.currency
                        };

                        fbq('track', 'AddToCart', fbqData);
                    }
                    catch(e) {
                        console.error(e);
                    }
                }

                _this.doc.trigger('ShowBasket');
            }
        });
    }
}
sunapiBasket.prototype.changeBasketItemQuantity = function(el = []) {
    if(el.length) {
        let _this = this,
            item = el.closest(this.p.classes.item),
            cMinusClass = this.p.classes.item_quantity_minus.replace('.', ''),
            cPlusClass = this.p.classes.item_quantity_plus.replace('.', ''),
            action = false,
            postData = {};

        var productId = item[0].dataset['product_id'];

        if(el.hasClass(cMinusClass))
            action = 'minus';
        else if(el.hasClass(cPlusClass))
            action = 'plus';

        postData = this.verifyBasketItemQuantityField(item, action);

        if(!$.isEmptyObject(postData)) {
            if(typeof this.timeouts.changeQty !== 'undefined')
                clearTimeout(this.timeouts.changeQty);

            this.timeouts.changeQty = setTimeout(function() {
                _this.makeAjaxAction('updateBasketItemQuantity', postData, function(content) {
                    if(content.status) {
                        //addBasketCounter(productId);
                        _this.doc.trigger('RefreshBasket');
                    }
                });
            }, this.ajax_delay);
        }
    }
}
sunapiBasket.prototype.deleteBasketItem = function(el = []) {
    if(el.length) {
        let _this = this,
            item = el.closest(this.p.classes.item),
            itemBasketId = parseInt(item.data('id')) || 0,
            itemProductId = parseInt(item.data('product_id')) || 0;

        // debugger;
        if(itemBasketId > 0) {
            markProductRemoveBasket(itemProductId);
            this.makeAjaxAction('deleteBasketItem', {id: itemBasketId}, function(content) {
                if(content.status) {
                    if (checkCounters()) {
                        delFromBasketCounter(itemProductId);
                    }

                    _this.doc.trigger('RefreshBasket');

                    if(_this.basket.basket_items_count == 1)
                        _this.doc.trigger('CloseBasket');
                }
            });
        }
    }
}
sunapiBasket.prototype.setBasketLineCounterAndSum = function() {
    if(this.el.basket_line_counter.length) {
        this.el.basket_line_counter.text(this.basket.basket_items_count);
    }

    if(this.el.basket_line_sum.length) {
        this.el.basket_line_sum.text(this.basket.basket_discount_sum_format);
    }
}
sunapiBasket.prototype.listScrollHandler = function() {
    let topOffset = this.el.list.scrollTop() || 0;

    if(topOffset > 0 && !this.el.header.hasClass('scrolling')) {
        this.el.header.addClass('scrolling');
    }
    else if(topOffset == 0 && this.el.header.hasClass('scrolling')) {
        this.el.header.removeClass('scrolling');
    }
}
sunapiBasket.prototype.showPreloader = function() {
    if(typeof this.el.preloader == 'undefined') {
        this.initPreloaderEl();
    }

    if(typeof this.el.preloader == 'object' && this.el.preloader.length) {
        this.el.preloader.addClass('active');
    }
}
sunapiBasket.prototype.hidePreloader = function() {
    if(typeof this.el.preloader == 'object' && this.el.preloader.length) {
        this.el.preloader.removeClass('active');
    }
}
sunapiBasket.prototype.showBasket = function(delay = 0) {
    let _this = this;

    setTimeout(function() {
        if(_this.el.wrapper.length) {
            _this.showPreloader();
            _this.el.wrapper.addClass('active');
            _this.body.addClass('body-fixed');
            _this.opened = true;
            _this.doc.trigger('GetBasketContent');
        }
    }, delay);
}
sunapiBasket.prototype.closeBasket = function() {
    if(this.el.wrapper.length) {
        this.el.wrapper.removeClass('active');
    }

    this.body.removeClass('body-fixed');
    this.opened = false;
}
sunapiBasket.prototype.getContent = function() {
    if(this.el.content.length) {
        let _this = this;

        this.showPreloader();
        this.makeAjaxAction('getContent', {}, function(content) {
            let newContent = $(content.html);

            if(typeof content.basket == 'object') {
                _this.basket = content.basket;
            }

            _this.setBasketLineCounterAndSum();

            if(newContent.length) {
                let itemsListHtml = newContent.find(_this.p.classes.list).html() || '',
                    // notEnoughSumSectionHtml = newContent.find(_this.p.classes.notEnoughSum).html() || '',
                    footerHtml = newContent.find(_this.p.classes.footer).html() || '';

                if(itemsListHtml.length)
                    _this.el.list.html(itemsListHtml);

                if(footerHtml.length)
                    _this.el.footer.html(footerHtml);

                if(1 == 11 && notEnoughSumSectionHtml.length) {
                    _this.el.notEnoughSection.html(notEnoughSumSectionHtml);
                    if (1 == 11 && _this.el.checkout) {
                        debugger;
                        if (newContent.find(_this.p.classes.notEnoughSum).find('.hidden').length) {
                            _this.el.checkout.addClass('disabled');
                        }
                        else {
                            _this.el.checkout.removeClass('disabled');
                        }
                    }
                }

                _this.checkEmptyBasket();

                _this.doc.trigger('OnAfterContentRefresh');
            }

            setTimeout(function() {
                _this.hidePreloader();
            }, 200);
        });
    }
}
sunapiBasket.prototype.checkEmptyBasket = function() {
    if(this.basket.empty_basket) {
        this.el.popup.addClass('empty-basket-list');
    }
    else {
        this.el.popup.removeClass('empty-basket-list');
    }
}
sunapiBasket.prototype.makeAjaxAction = function(action = '', postData = {}, callback) {
    if(action.length && typeof postData == 'object') {
        BX.ajax.runComponentAction('sunapi:basket', action, {
            mode: 'class',
            data: postData,
        }).then(function(response) {
            if(response.status == 'success' && typeof callback == 'function') {
                callback(response.data);
            }
        });
    }
}
sunapiBasket.prototype.calculateAdditionalDiscountLine = function() {
    if (!this.p.setup.show_discount_line || !this.p.setup.discount_line_threshold) return;
    
    function calculateProgress(cartTotal, threshold) {
        if (cartTotal >= threshold) return 100;
        return Math.min((cartTotal / threshold) * 100, 100);
    }
    function animateCounter(element, startValue, endValue, duration) {
        console.log(startValue, endValue);
        const range = Math.abs(endValue - startValue);
        if (startValue === 0 || range === 0) {
            element.text(endValue.toLocaleString());
            return;
        }

        const stepCount = Math.min(range, 100);
        const stepTime = Math.max(duration / stepCount, 10);
        const increment = (endValue - startValue) / stepCount;
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            element.text(Math.round(currentValue).toLocaleString());
            if ((increment > 0 && currentValue >= endValue) || (increment < 0 && currentValue <= endValue)) {
                clearInterval(timer);
                element.text(endValue.toLocaleString());
            }
        }, stepTime);
    }
    function generateConfetti(confettiCount = 20) {
        const container = document.querySelector('.basket-info__minimal-icon span');
        const colors = ['#b12435', '#761e19'];

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');

            const randomX = Math.random() * 200 - 100;
            const randomY = Math.random() * 100 + 50;
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            confetti.style.setProperty('--x', `${randomX}px`);
            confetti.style.setProperty('--y', `${randomY}px`);
            confetti.style.backgroundColor = randomColor;

            container.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 2000);
        }
    }

    if (typeof this.p.classes.discountLine == 'string' && this.p.classes.discountLine.length)
        this.el.discountLine = $(this.p.classes.discountLine);
    if (typeof this.p.classes.discountSumLeft == 'string' && this.p.classes.discountSumLeft.length)
        this.el.discountSumLeft = $(this.p.classes.discountSumLeft);
    if (typeof this.p.classes.discountCompleted == 'string' && this.p.classes.discountCompleted.length)
        this.el.discountCompleted = $(this.p.classes.discountCompleted);
    if (typeof this.p.classes.discountNotCompleted == 'string' && this.p.classes.discountNotCompleted.length)
        this.el.discountNotCompleted = $(this.p.classes.discountNotCompleted);
    if (typeof this.p.classes.discountSumIcon == 'string' && this.p.classes.discountSumIcon.length)
        this.el.discountSumIcon = $(this.p.classes.discountSumIcon);
    if (typeof this.p.classes.discountSumIconSpan == 'string' && this.p.classes.discountSumIconSpan.length)
        this.el.discountSumIconSpan = $(this.p.classes.discountSumIconSpan);

    const cartTotal = this.basket.basket_discount_sum;
    const threshold = this.p.setup.discount_line_threshold;
    const remaining = this.basket.discount_applied ? 0 : Math.max(threshold - cartTotal);
    const progressPercent = this.basket.discount_applied ? 100 : calculateProgress(cartTotal, threshold);

    const lineWidth = progressPercent + '%';

    const currentDisplayedValue = parseInt(this.el.discountSumLeft.attr('value'), 10) || 0;

    this.el.discountLine.css('width', lineWidth);

    if (remaining > 0) {
        if (this.el.discountCompleted.is(':visible')) {
            this.el.discountNotCompleted.css('display', 'block');
            this.el.discountCompleted.css('display', 'none');
            this.el.discountSumIcon.removeClass('red');
            this.el.discountSumIconSpan.removeClass('red');
        }
        this.el.discountSumLeft.attr('value', remaining);
        animateCounter(this.el.discountSumLeft, currentDisplayedValue, remaining, 1000);
    }
    else {
        if (currentDisplayedValue > 0) {
            animateCounter(this.el.discountSumLeft, currentDisplayedValue, 0, 1000);
            generateConfetti(20);
        }

        this.el.discountNotCompleted.css('display', 'none');
        this.el.discountCompleted.css('display', 'block');
        this.el.discountSumIcon.addClass('red');
        this.el.discountSumIconSpan.addClass('red');
    }
}