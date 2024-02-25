# Adapted from Will Webberley's work:
# https://wilw.dev/blog/2023/06/01/automatic-gemini-publishing/
# https://git.wilw.dev/wilw/wilw.dev/src/branch/main/gemini/process_capsule.py

import os, datetime, re
import frontmatter

capsule_url = 'gemini://gmi.runtimeterror.dev'
web_url = 'https://runtimeterror.dev'
content_dir = 'content'
email = 'blog@runtimeterror.dev'
feed_url = 'https://runtimeterror.dev/feed.xml'
site_name = '[runtimeterror]'

# Gemini-ify hyperlinks
def transform_links(content):
  lines = content.splitlines()
  pattern = re.compile(r'\[([^][]+)\]\(([^()]+)\)')
  current_link_ref = 1
  new_lines = []
  for line_index, line in enumerate(lines):
    if line.startswith('!['): continue
    links_to_add = []
    if not line.startswith('=>'):
      for link_index, match in enumerate(pattern.finditer(line)):
        description, url = match.groups()
        line = line.replace(f'({url})', f' [{current_link_ref}]').replace(f'[{description}]', description)
        # if URL self-references website, handle differently:
        if not url.startswith('http') or url.startswith(web_url):
          if web_url in url: url = url.replace(web_url, '')
          url = capsule_url + '/' + url.replace('/', ' ').strip().replace(' ', '-') + '.gmi'
        links_to_add.append(f'=> {url} {current_link_ref}')
        current_link_ref += 1
    new_lines.append(line)
    for link in links_to_add:
      new_lines.append(link)
  return '\n'.join(new_lines)

# Create new directories
needed_directories = ['capsule']
for dir in needed_directories:
  if not os.path.exists(dir):
    os.makedirs(dir)

# Generate blog posts
logs = []
for dirpath, dirnames, filenames in os.walk(content_dir):
    if 'index.md' in filenames:
        post = frontmatter.load(os.path.join(dirpath, 'index.md'))
        date = post['date'] if isinstance(post['date'], datetime.date) else datetime.datetime.strptime(post['date'].split('T')[0], '%Y-%m-%d')
        content = transform_links(post.content)
        new_content = '''
=> {} 🏡 Home

# {}
## Posted on {}

{}

=> mailto:{} Reply via email
=> {} Back to home
        '''.format(capsule_url, post['title'], date.strftime('%Y-%m-%d'), content, email, capsule_url)
        new_file_name = f'{os.path.basename(dirpath)}.gmi'
        logs.append({'file': new_file_name, 'title': post['title'], 'date': date})
        with open(f'capsule/{new_file_name}', 'w') as gem_file:
            gem_file.write(new_content)

# Generate blog index
logs.sort(key=lambda entry: entry['date'].strftime('%Y-%m-%d'), reverse=True)
log_index_content = '''
=> {} 🏡 Home

# {}

=> {} 📲 Subscribe via RSS

{}

=> {} 🏡 Home
'''.format(capsule_url, site_name, feed_url,
  '\n'.join(['=> {} {} - {}'.format(l['file'], l['date'].strftime('%Y-%m-%d'), l['title']) for l in logs]),
  capsule_url)
gem_index_file = open(f'capsule/index.gmi', 'w')
gem_index_file.write(log_index_content)

