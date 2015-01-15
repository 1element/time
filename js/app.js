;(function($) {
	var storage = {
		get: function(id) {
			return localStorage.getItem(id);
		},
		save: function(id, value) {
			localStorage.setItem(id, value);
		},
		delete: function(id) {
			localStorage.removeItem(id);
		},
		getAllByDate: function() {
			var rows = [];
			for (var i=0, l=localStorage.length; i<l; i++) {
				var key = localStorage.key(i);
				var data = JSON.parse(localStorage[key]);
				//if today, add to return
				if (new Date(data.date).toDateString() == (new Date()).toDateString()) {
					rows[i] = data;
				}
			}
			return rows;
		}
	};
	
	var util = {
		ms2m: function(ms) {
			return Math.floor(Math.floor(ms / 1000) / 60);
		},
		m2ms: function(m) {
			return parseInt(m) * 60 * 1000;
		}
	};
	
	var timer = {
		start_time: 0,
		interval: null,
		speed: 5000,
		start: function(start_time, func) {
			this.start_time = start_time;
			this.interval = setInterval(func, this.speed);
		},
		stop: function() {
			clearInterval(this.interval);
		}
	};
	
	var TimeEntry = function(description) {
		this.id = this.generateId();
		this.description = description;
		this.startTime = this.totalTime = 0;
	};
	
	TimeEntry.prototype.save = function() {
		storage.save(this.id, JSON.stringify(this));
	};
	
	TimeEntry.prototype.setDateEntry = function(date) {
		this.date = date;
	};
	
	TimeEntry.prototype.setStartTime = function(timestamp) {
		this.startTime = timestamp;
	};
	
	TimeEntry.prototype.setTotalTime = function(totalTime) {
		this.totalTime = totalTime;
	};
	
	TimeEntry.get = function(id) {
		var data = JSON.parse(storage.get(id));
		var te = new TimeEntry(data.description);
		te.id = data.id;//this is messy
		te.startTime = data.startTime;//this is messy
		te.totalTime = data.totalTime;//this is messy
		te.date = data.date;//this is messy
		return te;
	};
	
	TimeEntry.prototype.generateId = function() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		});
		return uuid;
	};
	
	var ui = {
		$current_li: undefined,
		init: function() {
			$('body').append('<div id="entry"><input type="text" id="input" name="input" placeholder="Enter task..." /><input type="button" id="save" value="Save" /></div><ul id="entries"></ul><ul id="totalentry"><li><span class="description">Total time</span> <span id="totaltime" class="time"></span></ul>');
			$('#save').click(this.saveHandler);
			$('#entries').on('click', '.start', this.startHandler);
			$('#entries').on('click', '.stop', this.stopHandler);
			$('#entries').on('click', '.delete', this.deleteHandler);
			$('#entries').on('click', '.edit', this.editHandler);
			$('#entries').on('click', '.update', this.updateHandler);
			$('#input').keypress(function(e) {
				if (e.which == 13) {
					$('#save').trigger('click');
				}
			});
			this.loadEntries();
		},
		loadEntries: function() {
			var data = storage.getAllByDate();
			for (var i=0, l=data.length; i<l; i++) {
				$('#entries').append('<li id="' + data[i].id + '"><span class="description">' + data[i].description + '</span> <span class="time">[' + util.ms2m(data[i].totalTime) + ']</span><span class="controls"><input type="button" class="start" value="Start" /> <input type="button" class="edit" value="Edit" /> <input type="button" class="delete" value="Delete" /></span></li>');
			}
      this.showTotalTime();
		},
    showTotalTime: function() {
      var totalTime = 0;
      $('#entries li .time').each(function(){
        var time = parseInt($(this).text().replace(/[^\d]/g, ''));
        totalTime = totalTime + time;
      });
      $('#totaltime').html('[' + totalTime + ']');
    },
		updateTime: function() {
			//console.log(this);
			//"this" context is window cause it is called from setInterval
			var now = new Date().getTime();
			var totalTime = now - timer.start_time;
			ui.$current_li.find('.time').html('[' + util.ms2m(totalTime) + ']');
      ui.showTotalTime();
		},
		saveHandler: function(e) {
			var desc = $('#input').val();
			$('#input').val('');
			var te = new TimeEntry(desc);
			te.setDateEntry(new Date());
			te.save();
			$('#entries').append('<li id="' + te.id + '"><span class="description">' + desc + '</span> <span class="time">[' + util.ms2m(te.totalTime) + ']</span><span class="controls"><input type="button" class="start" value="Start" /> <input type="button" class="edit" value="Edit" /> <input type="button" class="delete" value="Delete" /></span></li>');
		},
		startHandler: function(e) {
			//get parent li from click event
			$li = $(e.target).parent().parent().addClass('active');
			//store a reference to the li element that is recording
			ui.$current_li = $li;
			//update start button on clicked start button (make stop button)
			$li.find('.start').removeClass('start').addClass('stop').attr('value', 'Stop');
			//disable all buttons
			$('.start, .delete, .edit, #save, #input').attr('disabled', 'disabled');
			//set start time on clicked time entry
			var id = $li.attr('id');
			var te = TimeEntry.get(id);
			var start_time = new Date().getTime();
			te.setStartTime(start_time);
			te.save();
			//"this" is bound to the start button element so prefix with ui
			//we subtract totalTime so the running total is correct
			timer.start(start_time - te.totalTime, ui.updateTime);
			//console.log(window['localStorage']);
      ui.showTotalTime();
		},
		stopHandler: function(e) {
			//get parent li from click event
			$li = $(e.target).parent().parent().removeClass('active');
			//update stop button on clicked stop button (make start button)
			$li.find('.stop').removeClass('stop').addClass('start').attr('value', 'Start');
			//enable all buttons
			$('.start, .delete, .edit, #save, #input').attr('disabled', false);
			//set time on clicked time entry
			var id = $li.attr('id');
			var te = TimeEntry.get(id);
			var stopTime = new Date().getTime();
			var totalTime = stopTime - te.startTime + te.totalTime;
			$li.find('.time').html('[' + util.ms2m(totalTime) + ']');
			te.setTotalTime(totalTime);
			te.save();
			timer.stop();
			//console.log(window['localStorage']);
      ui.showTotalTime();
		},
		deleteHandler: function(e) {
			$li = $(e.target).parent().parent();
			var id = $li.attr('id');
			storage.delete(id);
			$li.remove();
      ui.showTotalTime();
		},
		editHandler: function(e) {
			//get parent li from click event
			$li = $(e.target).parent().parent().addClass('editing');
			//update stop button on clicked stop button (make start button)
			$li.find('.edit').removeClass('edit').addClass('update').attr('value', 'Save');
			//disable all buttons
			$('.start, .delete, .edit, #save, #input').attr('disabled', 'disabled');
			//set time on clicked time entry
			var id = $li.attr('id');
			var te = TimeEntry.get(id);
			//load data into text fields
			$li.find('.description').html('<input type="text" class="edit-text edit-description" value="' + te.description + '" />');
			$li.find('.time').html('<input type="text" class="edit-text edit-time" value="' + util.ms2m(te.totalTime) + '" />');
		},
		updateHandler: function(e) {
			//get parent li from click event
			$li = $(e.target).parent().parent().removeClass('editing');
			//update stop button on clicked stop button (make start button)
			$li.find('.update').removeClass('update').addClass('edit').attr('value', 'Edit');
			//enable all buttons
			$('.start, .delete, .edit, #save, #input').attr('disabled', false);
			//set time on clicked time entry
			var id = $li.attr('id');
			var te = TimeEntry.get(id);
			//save data from text fields
			te.description = $li.find('.edit-description').val();
			te.totalTime = util.m2ms($li.find('.edit-time').val());
			te.save();
			//convert back to normal entry (no text fields)
			$li.find('.description').html(te.description);
			$li.find('.time').html('[' + util.ms2m(te.totalTime) + ']');
      ui.showTotalTime();
		}
	};
	
	$('document').ready(function() {
		ui.init();
	});
})(jQuery);