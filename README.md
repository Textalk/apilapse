Apilapse
========

Issue tracking kanban-like angularjs based frontend for API-backends like redmine, github etc

The goal is to get a loosely bound postit-like board view of issues from one or more backends.


Install
-------

1. Clone this repo somewhere you can point your broswer with http(s).  (Browsers don't allow
ajax-requests to your file-system, so you need http.)

2. `bower install`. If you don't have bower, install it with `npm install bower` (or `sudo npm install -g bower` to install it globally in your system). If you don't have npm, install it with `apt-get install npm` or the equivallent for your system.

3. Make your own board configs (in conf-dir, if you like).

4. Point your browser to index.html?board=<your conf-url> (e.g. conf/apilapse-board.json)



Configuration
-------------


### Connections

Connections can be defined directly in the board.json and referred to by key, here `asf-github`:
```
{
  "connections": [
    "asf-github": {
      "connector": "github",
      "owner":     "Textalk",
      "repo":      "angular-schema-form"
    }
  ],
  …
}
```

…or in it's own json-file, referred to by it's URL (relative index.html or absolute).


### Board list

Configured in `conf/boards.json`.



### Board


Connectors
----------

### Redmine

Example of a redmine connector:
```javascript
{
  "connector": "redmine",
  "baseUrl":   "http://redmine.textalk.com/",
  "prioField": 36
}
```

#### baseUrl

baseUrl is the redmine installation, with trailing slash.


#### prioField 

prioField is the ID of a custom field of type float that is used to save priority within a board.
If you have several boards displaying the same issue in different bindings, the priority will be
messed up…


### Github

Example of a github connector:
```javascript
{
  "connector": "github",
  "owner":     "Textalk",
  "repo":      "apilapse"
}
```


Styling and colour coding
-------------------------

In the top board in the definition, you can add a `css` field with a string value of a CSS URL to
load.  All issues get classes based on their backend.  For example, a redmine issue could get
classes `redmine tracker_1 project_3`.

For the css rules to be used, you may have to specify:
```css
.issue .lapp.tracker_1 {
  background-color: lightcoral
}
```


License
-------

Apilapse is under the [GNU Affero General Public
License](http://www.gnu.org/licenses/agpl-3.0.html).  See COPYING.


Contributing
------------

Pull requests are welcome.  Keep separate things separate.  [Keep it
simple](http://www.infoq.com/presentations/Simple-Made-Easy).

Code standard: We use [jscs](http://jscs.info/), with [Google JavaScript Style
Guide](https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml) as preset, but with
a line length of 100.
