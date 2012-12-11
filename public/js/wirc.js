var BASEURL = window.location.href;

(function($) {

Structure.registerModule('Wirc', {
  websocket: function(path, callbacks) {
    var url = BASEURL.replace(/^http/, 'ws') + path;
    var websocket = new ReconnectingWebSocket(BASEURL.replace(/^http/, 'ws') + '/socket');
    if(window.console) console.log('[websocket] ' + url);
    $.each(callbacks, function(name, callback) { websocket[name] = callback; });
    return websocket;
  }
}); // End Wirc

Structure.registerModule('Wirc.Chat', {
  autocomplete_commands: [
    '/join #',
    '/msg ',
    '/me ',
    '/nick ',
    '/part ',
    ],
  formatIrcData: function(data) {
    var me_re = new RegExp("\\b" + this.nick + "\\b");
    var action = data.message.match(/^\u0001ACTION (.*)\u0001$/);

    if(action) data.message = action[1];

    data.nick = data.sender.replace(/!.*/, '');
    data.message = data.message.replace(/</i, '&lt;').replace(/\b(\w{2,5}:\/\/\S+)/g, '<a href="$1" target="_blank">$1</a>');
    data.template = action ? 'action_message_template' : 'message_template';
    data.class_name = data.prefix === this.nick                           ? 'me'
                    : data.message.match(me_re)                           ? 'focus'
                    : $('#chat_messages').find('li:last').hasClass('odd') ? 'even'
                    :                                                       'odd';

    return data;
  },
  print: function(data) {
    // need to calculate at_bottom before appending a new element
    var at_bottom = $(window).scrollTop() + $(window).height() >= $('body').height() - 30;
    var $messages = this.$messages;

    if(data.timestamp) {
      data.timestamp = new Date(parseInt(data.timestamp, 10));
    }

    if(data.status) {
      if(data.status == this.status) return; // do not want duplicate status messages
      if(data.message) $messages.append(tmpl('server_status_template', data));
      this.status = data.status;
    }
    else if(data.new_nick) {
      if(data.old_nick == this.nick) {
        this.nick = data.new_nick;
      }
      $messages.append(tmpl('nick_change_template', data));
    }
    else if(data.message && data.target == this.target) {
      data = this.formatIrcData(data);
      $messages.append(tmpl(data.template, data));
    }

    if(at_bottom) {
      this.scrollToBottom();
    }
  },
  scrollToBottom: function() {
    $('html, body').scrollTop($('body').height());
  },
  receiveData: function(e) {
    var data = $.parseJSON(e.data);
    if(window.console) console.log('[websocket] > ' + e.data);
    if(data.joined) {
      data.channel_id=data.joined.replace(/\W/g,'');
      var $channel=$('#target_'+data.cid+'_'+data.channel_id);
      if(!$channel.length) {
        console.log(data.cid);
        $('#connection_'+data.cid+' .channels').append(tmpl('new_channel_template',data));
      }
    }
    else if(data.parted) {
      data.channel_id=data.parted.replace(/\W/g,'');
      $('#target_'+data.cid+'_'+data.channel_id).remove();
    }
    else {
      this.print(data);
    }
  },
  sendData: function(data) {
    // TODO: Figure out if JSON.stringify() works in other browsers than chrome
    try {
      this.websocket.send(JSON.stringify(data));
      if(window.console) console.log('[websocket] < ' + JSON.stringify(data));
    } catch(e) {
      if(window.console) console.log('[websocket] ! ' + e);
      this.print({ error: '[ws]' + e });
    }
  },
  connectToWebSocket: function() {
    var self = this;
    self.websocket = Wirc.websocket('/socket', {
      onmessage: self.receiveData,
      onopen: function function_name (argument) {
        self.$input.removeAttr('disabled').css({ background: '#fff' }).val('');
        self.sendData({ cid: self.connection_id, target: self.target });
      },
      onerror: function(e) {
        self.$input.attr('disabled', 'disabled').css({ background: '#fdd' }).val(e);
        // TODO: Should we reconnect here?
      },
      onclose: function() {
        self.$input.attr('disabled', 'disabled').css({ background: '#eee' }).val('Reconnecting...');
      }
    });
  },
  setupUI: function() {
    var self = this;
    var tab_count = 0;
    var partial = null;  
    self.$input.cmd({
        prompt: '['+self.target+'] ',
        keydown: function(e,cmd) {
          if (e.which !== 9) { // not a TAB
              partial = null;
              tab_count = 0;
          }
          else {
            ++tab_count;
            var command = partial || self.$input.get();
            if (!command.match(' ')) { // complete only first word
                var reg = new RegExp('^' + command);
                var matched = [];
                for (i in self.autocomplete_commands) {
                    if (reg.test(self.autocomplete_commands[i])) {
                        matched.push(self.autocomplete_commands[i]);
                    }
                }
                if(!matched.length) { return false; }
                if (matched.length <= tab_count) {
                  tab_count=0;
                } 
                partial= matched.length ? command : null;
                self.$input.set(matched[tab_count]);
                return false;
              }
            return true;
          }
          return true;
          
        },
        commands: function(command) {
          self.sendData({ cid: self.connection_id, target: self.target, cmd: command });
        }
      });

    self.$input.attr('disabled', 'disabled').css({ background: '#eee' }).val('Connecting...');
    self.$input.parents('form').submit(function() {
      self.sendData({ cid: self.connection_id, target: self.target, cmd: self.$input.val() });
      self.$input.val('');
      return false;
    });

    $('body').click(function() { self.$input.focus(); });
    self.scrollToBottom();
  },
  listenToScroll: function() {
    var $win = $(window);
    var $messages = $('#chat_messages');
    var $loading;
    var page = 1;
    var height;

    $win.on('scroll', function() {
      if($loading || $win.scrollTop() !== 0) return;
      $loading = $('<div class="alert alert-info">Loading previous conversations...</div>');
      height = $('body').height();
      page++;
      $messages.before($loading);
      if(window.console) console.log(BASEURL + '/history/' + page);
      $.ajax({
        url: BASEURL + '/history/' + page,
        success: function(data) {
          var $li = $(data).find('#chat_messages li');
          if($li.length) {
            $messages.prepend($li);
            $loading.remove();
            $loading = false;
            $win.scrollTop($('body').height() - height);
          }
          else {
            $loading.removeClass('alert-info').text('End of conversation log.');
          }
        }
      });
    });
  },
  start: function($) {
    var self = this;
    self.connection_id = $('#chat_messages').attr('data-cid');
    self.nick = $('#chat_messages').attr('data-nick');
    self.target = $('#chat_messages').attr('data-target');
    self.$messages = $('#chat_messages');
    self.$input = $('#command_line');
    self.connectToWebSocket();
    self.setupUI();
    self.listenToScroll();

    $.each($('#chat_messages').attr('data-nicks').split(','), function(i, v) {
      v = v.replace(/^\@/, '');
      self.autocomplete_commands.unshift(v+': ');
    });

    if(window.console) console.log('[Wirc.Chat.start] ', this);
  }
}); /* End Structure.registerModule('Wirc.Chat') */

$(document).ready(function() {
  BASEURL = $('script[src$="jquery.js"]').get(0).src.replace(/\/js\/[^\/]+$/, '');
  $('#chat_messages').each(function() { setTimeout(function() { Wirc.Chat.start($); }, 100); });
});

})(jQuery);

/*
 * Flash fallback for websocket
 *
if(!('WebSocket' in window)) {
  document.write([
    '<script type="text/javascript" src="' + BASEURL + '/js/swfobject.js"></script>',
    '<script type="text/javascript" src="' + BASEURL + '/js/FABridge.js"></script>',
    '<script type="text/javascript" src="' + BASEURL + '/js/web_socket.js"></script>'
  ].join(''));
}
if(WebSocket.__initialize) {
  // Set URL of your WebSocketMain.swf here:
  WebSocket.__swfLocation = BASEURL + '/js/WebSocketMain.swf';
}
*/
