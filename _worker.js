/**
 * Service Status Monitor
 * 
 * @description 服务状态监控面板
 * @version 1.0.0
 * @author hares
 * @copyright 2024 hares. All rights reserved.
 * @license MIT
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // 检查是否已登录
    const url = new URL(request.url);
    const cookie = request.headers.get('Cookie') || '';
    const isAdmin = cookie.includes('isAdmin=true');
    
    // 处理登录请求
    if (url.pathname === '/login') {
      const formData = await request.formData();
      const password = formData.get('password');
      
      // 从环境变量获取正确的密码
      const correctPassword = ADMIN_PASSWORD;
      
      if (password === correctPassword) {
        return new Response('登录成功', {
          status: 200,
          headers: {
            'Set-Cookie': 'isAdmin=true; path=/; max-age=1200', // 20分钟过期 (20 * 60 = 1200秒)
            'Location': '/',
          }
        });
      } else {
        return new Response('密码错误', { status: 401 });
      }
    }

    // 从环境变量获取监控链接，解析 JSON
    const monitorList = JSON.parse(MONITOR_URLS)
    
    // 获取所有链接的数据
    const responses = await Promise.all(
      monitorList.map(async item => {
        try {
          const response = await fetch(item.url);
          if (!response.ok) {
            return {
              name: item.name,
              url: item.url,
              error: `HTTP ${response.status}`,
              services: [],
              monitoring: 'ERROR'
            };
          }
          const data = await response.json();
          return { ...data, name: item.name, url: item.url };
        } catch (error) {
          return {
            name: item.name,
            url: item.url,
            error: error.message,
            services: [],
            monitoring: 'ERROR'
          };
        }
      })
    )

    // 生成HTML表格
    const tableRows = responses.map((data) => {
      if (data.error) {
        return `
          <tr>
            <td>${data.name}</td>
            <td colspan="2" class="status-stopped">错误: ${data.error}</td>
          </tr>
        `;
      }
      
      const getStatusText = (status) => {
        switch(status.toLowerCase()) {
          case 'running': return '正常';
          case 'stopped': return '停止';
          default: return '-';
        }
      };

      const sbxService = data.services.find(s => s.name === 'sbx') || { status: '-' };
      const argoService = data.services.find(s => s.name === 'argo') || { status: '-' };

      return `
        <tr>
          <td>${data.name}</td>
          <td class="status-${sbxService.status.toLowerCase()}">${getStatusText(sbxService.status)}</td>
          <td class="status-${argoService.status.toLowerCase()}">${getStatusText(argoService.status)}</td>
        </tr>
      `;
    }).join('')

    // 添加代理处理
    if (request.url.includes('/proxy')) {
      // 检查是否已登录
      if (!isAdmin) {
        return new Response('未登录', { status: 401 });
      }

      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      
      // 处理 OPTIONS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      try {
        const response = await fetch(targetUrl);
        return new Response(response.body, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'content-type': response.headers.get('content-type'),
          },
        });
      } catch (error) {
        return new Response('Error: ' + error.message, { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 处理 robots.txt 请求
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="robots" content="noindex, nofollow">
          <meta name="googlebot" content="noindex, nofollow">
          <title>服务状态监控</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              overflow-x: hidden;
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
              text-align: center;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: center;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            @media screen and (max-width: 768px) {
              table {
                width: 95%;
                font-size: 14px;
              }
              th, td {
                padding: 5px;
              }
              .btn {
                padding: 4px 8px;
                font-size: 12px;
                margin: 2px;
              }
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .status-running {
              color: green;
            }
            .status-stopped {
              color: red;
            }
            .status-error {
              color: red;
            }
            .btn {
              margin: 0 5px;
              padding: 5px 10px;
              border: none;
              border-radius: 3px;
              cursor: pointer;
            }
            .btn-start {
              background-color: #4CAF50;
              color: white;
            }
            .btn-stop {
              background-color: #f44336;
              color: white;
            }
            .btn-list {
              background-color: #2196F3;
              color: white;
            }
            .modal {
              display: none;
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0,0,0,0.5);
              overflow-y: auto;
            }
            .modal-content {
              background-color: #fefefe;
              margin: 15% auto;
              padding: 20px;
              border: 1px solid #888;
              width: 80%;
              max-width: 800px;
              border-radius: 5px;
              position: relative;
            }
            .close {
              color: #aaa;
              float: right;
              font-size: 28px;
              font-weight: bold;
              cursor: pointer;
              position: absolute;
              right: 10px;
              top: 5px;
            }
            .close:hover {
              color: black;
            }
            #modalContent {
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: break-word;
              max-height: 70vh;
              overflow-y: auto;
              margin-top: 20px;
              font-family: monospace;
              line-height: 1.6;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 5px;
              font-size: 14px;
              color: #333;
            }
            .login-form {
              text-align: center;
              margin-bottom: 20px;
            }
            .login-form input {
              padding: 5px 10px;
              margin-right: 10px;
            }
            .login-form button {
              padding: 5px 15px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 3px;
              cursor: pointer;
            }
            .logout-btn {
              padding: 5px 15px;
              background-color: #f44336;
              color: white;
              border: none;
              border-radius: 3px;
              cursor: pointer;
              margin-bottom: 20px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .footer a {
              color: #1a73e8;
              text-decoration: none;
            }
            .footer a:hover {
              text-decoration: underline;
            }
          </style>
          <script>
            async function handleAction(url, action) {
              // 检查登录状态
              const isAdmin = document.cookie.includes('isAdmin=true');
              if (!isAdmin) {
                alert('请先登录');
                return;
              }

              try {
                const actionUrl = url.replace('/status', '/' + action);
                const proxyResponse = await fetch('/proxy?url=' + encodeURIComponent(actionUrl));
                if (proxyResponse.status === 401) {
                  alert('请先登录');
                  location.reload();
                  return;
                }
                if (proxyResponse.ok) {
                  if (action === 'list') {
                    const data = await proxyResponse.text();
                    const formattedData = formatProcessList(data);
                    showModal(formattedData);
                  } else {
                    alert('操作成功');
                    location.reload();
                  }
                } else {
                  alert('操作失败: ' + proxyResponse.statusText);
                }
              } catch (error) {
                alert('操作失败: ' + error.message);
              }
            }

            function formatProcessList(data) {
              // 分割每一行
              const lines = data.split('\\n');
              // 过滤空行
              const filteredLines = lines.filter(line => line.trim());
              // 为每行添加适当的间距和格式
              return filteredLines.map(line => {
                // 如果行以特定字符开头，添加额外的格式
                if (line.includes('USER') || line.includes('PID')) {
                  return '\\n' + line + '\\n' + '='.repeat(80);
                }
                // 为普通行添加缩进
                return '  ' + line;
              }).join('\\n');
            }

            function showModal(content) {
              const modal = document.getElementById('processModal');
              const modalContent = document.getElementById('modalContent');
              modalContent.textContent = content;
              modal.style.display = 'block';
            }

            function closeModal() {
              const modal = document.getElementById('processModal');
              modal.style.display = 'none';
            }

            // 点击模态框外部关闭
            window.onclick = function(event) {
              const modal = document.getElementById('processModal');
              if (event.target == modal) {
                modal.style.display = 'none';
              }
            }

            async function login() {
              const password = document.getElementById('password').value;
              const formData = new FormData();
              formData.append('password', password);
              
              try {
                const response = await fetch('/login', {
                  method: 'POST',
                  body: formData
                });
                
                if (response.ok) {
                  location.reload();
                } else {
                  alert('密码错误');
                }
              } catch (error) {
                alert('登录失败: ' + error.message);
              }
            }

            function logout() {
              document.cookie = 'isAdmin=true; path=/; max-age=0';
              location.reload();
            }
          </script>
        </head>
        <body>
          <h1>服务状态监控</h1>
          ${isAdmin ? `
            <button class="logout-btn" onclick="logout()">退出登录</button>
          ` : `
            <div class="login-form">
              <input type="password" id="password" placeholder="请输入管理密码">
              <button onclick="login()">登录</button>
            </div>
          `}
          <table>
            <thead>
              <tr>
                <th>服务器</th>
                <th>Sing-box</th>
                <th>Argo</th>
                ${isAdmin ? '<th>操作</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${responses.map((data) => {
                if (data.error) {
                  return `
                    <tr>
                      <td>${data.name}</td>
                      <td colspan="${isAdmin ? 3 : 2}" class="status-stopped">错误: ${data.error}</td>
                    </tr>
                  `;
                }
                
                const getStatusText = (status) => {
                  switch(status.toLowerCase()) {
                    case 'running': return '正常';
                    case 'stopped': return '停止';
                    default: return '-';
                  }
                };

                const sbxService = data.services.find(s => s.name === 'sbx') || { status: '-' };
                const argoService = data.services.find(s => s.name === 'argo') || { status: '-' };

                return `
                  <tr>
                    <td>${data.name}</td>
                    <td class="status-${sbxService.status.toLowerCase()}">${getStatusText(sbxService.status)}</td>
                    <td class="status-${argoService.status.toLowerCase()}">${getStatusText(argoService.status)}</td>
                    ${isAdmin ? `
                      <td>
                        <button class="btn btn-start" onclick="handleAction('${data.url}', 'start')">保活</button>
                        <button class="btn btn-stop" onclick="handleAction('${data.url}', 'stop')">停止</button>
                        <button class="btn btn-list" onclick="handleAction('${data.url}', 'list')">进程</button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${isAdmin ? `
            <!-- 模态框 -->
            <div id="processModal" class="modal">
              <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <pre id="modalContent"></pre>
              </div>
            </div>
          ` : ''}

          <div class="footer">
            基于 <a href="https://github.com/eooce/Sing-box" target="_blank">eooce/Sing-box</a> 的脚本制作的监控页面
          </div>
        </body>
      </html>
    `

    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      },
    })
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 })
  }
}
