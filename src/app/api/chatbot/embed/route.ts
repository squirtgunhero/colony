import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/chatbot/embed?token=EMBED_TOKEN
 * Serves the embeddable JavaScript widget.
 * Website owners add: <script src="https://app.colony.com/api/chatbot/embed?token=TOKEN"></script>
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("// Colony Chat: Missing embed token", {
      status: 400,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const script = generateWidgetScript(baseUrl, token);

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function generateWidgetScript(baseUrl: string, token: string): string {
  return `
(function() {
  'use strict';

  if (window.__colonyChatLoaded) return;
  window.__colonyChatLoaded = true;

  var API_BASE = '${baseUrl}/api/chatbot';
  var TOKEN = '${token}';
  var VISITOR_ID = getVisitorId();
  var config = null;
  var conversationId = null;
  var qualificationData = {};
  var isOpen = false;
  var currentQuestion = null;

  // Generate or retrieve persistent visitor ID
  function getVisitorId() {
    var id = localStorage.getItem('colony_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('colony_visitor_id', id);
    }
    return id;
  }

  // Fetch bot configuration
  function loadConfig() {
    fetch(API_BASE + '/widget/' + TOKEN)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) {
          console.warn('Colony Chat:', data.error);
          return;
        }
        config = data;
        renderWidget();
        if (config.autoGreet) {
          setTimeout(function() {
            if (!isOpen) showGreeting();
          }, config.autoGreetDelay * 1000);
        }
      })
      .catch(function(err) {
        console.warn('Colony Chat: Failed to load config', err);
      });
  }

  // Render the chat widget
  function renderWidget() {
    var container = document.createElement('div');
    container.id = 'colony-chat-widget';
    container.innerHTML = getWidgetHTML();
    document.body.appendChild(container);

    // Add styles
    var style = document.createElement('style');
    style.textContent = getWidgetCSS();
    document.head.appendChild(style);

    // Bind events
    document.getElementById('colony-chat-toggle').onclick = toggleChat;
    document.getElementById('colony-chat-close').onclick = toggleChat;
    document.getElementById('colony-chat-send').onclick = sendMessage;
    document.getElementById('colony-chat-input').onkeypress = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
  }

  function showGreeting() {
    var bubble = document.getElementById('colony-chat-greeting');
    if (bubble && config.welcomeMessage) {
      bubble.textContent = config.welcomeMessage;
      bubble.style.display = 'block';
      bubble.onclick = function() {
        bubble.style.display = 'none';
        toggleChat();
      };
    }
  }

  function toggleChat() {
    isOpen = !isOpen;
    var panel = document.getElementById('colony-chat-panel');
    var greeting = document.getElementById('colony-chat-greeting');
    if (panel) panel.style.display = isOpen ? 'flex' : 'none';
    if (greeting) greeting.style.display = 'none';
    if (isOpen && !conversationId) startConversation();
  }

  function startConversation() {
    fetch(API_BASE + '/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        embedToken: TOKEN,
        visitorId: VISITOR_ID,
        pageUrl: window.location.href,
        referrer: document.referrer || undefined,
        utmSource: getUrlParam('utm_source'),
        utmMedium: getUrlParam('utm_medium'),
        utmCampaign: getUrlParam('utm_campaign'),
      }),
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        conversationId = data.conversationId;
        qualificationData = data.qualificationData || {};
        if (data.messages) {
          data.messages.forEach(function(msg) {
            appendMessage(msg.role, msg.content, msg.questionId, msg.fieldMapping);
          });
        }
      })
      .catch(function(err) {
        console.warn('Colony Chat: Failed to start conversation', err);
      });
  }

  function sendMessage() {
    var input = document.getElementById('colony-chat-input');
    var content = input.value.trim();
    if (!content || !conversationId) return;

    input.value = '';
    appendMessage('visitor', content);

    // If there's a current qualification question, submit as qualification answer
    if (currentQuestion) {
      fetch(API_BASE + '/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'qualify',
          conversationId: conversationId,
          questionId: currentQuestion.questionId,
          fieldMapping: currentQuestion.fieldMapping,
          value: content,
        }),
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          currentQuestion = null;
          if (data.botResponse) {
            appendMessage('bot', data.botResponse.content, data.botResponse.questionId, data.botResponse.fieldMapping);
            if (data.botResponse.questionId) {
              currentQuestion = {
                questionId: data.botResponse.questionId,
                fieldMapping: data.botResponse.fieldMapping,
              };
            }
          }
        });
      return;
    }

    // Regular message
    fetch(API_BASE + '/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message',
        conversationId: conversationId,
        content: content,
      }),
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.botResponse) {
          appendMessage('bot', data.botResponse.content, data.botResponse.questionId, data.botResponse.fieldMapping);
          if (data.botResponse.questionId) {
            currentQuestion = {
              questionId: data.botResponse.questionId,
              fieldMapping: data.botResponse.fieldMapping,
            };
          }
        }
      });
  }

  function appendMessage(role, content, questionId, fieldMapping) {
    var messages = document.getElementById('colony-chat-messages');
    var div = document.createElement('div');
    div.className = 'colony-msg colony-msg-' + role;
    div.textContent = content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

    if (questionId && fieldMapping) {
      currentQuestion = { questionId: questionId, fieldMapping: fieldMapping };
    }
  }

  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || undefined;
  }

  function getWidgetHTML() {
    var pos = config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;';
    var name = config.companyName || config.name || 'Chat';
    var avatar = config.avatarUrl
      ? '<img src="' + config.avatarUrl + '" style="width:32px;height:32px;border-radius:50%;" />'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    return '' +
      '<div id="colony-chat-greeting" style="display:none;position:fixed;bottom:90px;' + pos + 'max-width:260px;padding:12px 16px;background:white;color:#333;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);font-size:14px;cursor:pointer;z-index:99998;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"></div>' +
      '<button id="colony-chat-toggle" style="position:fixed;bottom:20px;' + pos + 'width:56px;height:56px;border-radius:50%;background:' + config.brandColor + ';border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99999;display:flex;align-items:center;justify-content:center;">' + avatar + '</button>' +
      '<div id="colony-chat-panel" style="display:none;position:fixed;bottom:88px;' + pos + 'width:370px;height:520px;background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:99999;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">' +
        '<div style="background:' + config.brandColor + ';padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:10px;color:white;">' +
            (config.avatarUrl ? '<img src="' + config.avatarUrl + '" style="width:28px;height:28px;border-radius:50%;" />' : '') +
            '<span style="font-weight:600;font-size:15px;">' + name + '</span>' +
          '</div>' +
          '<button id="colony-chat-close" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;padding:0;line-height:1;">&times;</button>' +
        '</div>' +
        '<div id="colony-chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;"></div>' +
        '<div style="padding:12px 16px;border-top:1px solid #eee;display:flex;gap:8px;">' +
          '<input id="colony-chat-input" type="text" placeholder="Type a message..." style="flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:24px;outline:none;font-size:14px;" />' +
          '<button id="colony-chat-send" style="width:40px;height:40px;border-radius:50%;background:' + config.brandColor + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function getWidgetCSS() {
    return '' +
      '.colony-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }' +
      '.colony-msg-bot { background: #f0f0f0; color: #333; align-self: flex-start; border-bottom-left-radius: 4px; }' +
      '.colony-msg-visitor { background: ' + config.brandColor + '; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }' +
      '.colony-msg-system { background: #fff3cd; color: #856404; align-self: center; text-align: center; font-size: 12px; }' +
      '#colony-chat-input:focus { border-color: ' + config.brandColor + '; }';
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }
})();
`;
}
