"use strict";

var NodeGit = require("../");
var Status = NodeGit.Status;

var StatusFile = function StatusFile(args) {
  var path = args.path;
  var status = args.status;
  var entry = args.entry;

  if (entry) {
    status = entry.status();
    if (entry.indexToWorkdir()) {
      path = entry.indexToWorkdir().newFile().path();
    } else {
      path = entry.headToIndex().newFile().path();
    }
  }

  var codes = Status.STATUS;

  var getStatus = function getStatus() {
    var fileStatuses = [];

    for (var key in Status.STATUS) {
      if (status & Status.STATUS[key]) {
        fileStatuses.push(key);
      }
    }

    return fileStatuses;
  };

  var data = {
    path: path,
    entry: entry,
    statusBit: status,
    statuses: getStatus()
  };

  return {
    status: function status() {
      return data.statuses;
    },
    statusBit: function statusBit() {
      return data.statusBit;
    },
    headToIndex: function headToIndex() {
      if (data.entry) {
        return entry.headToIndex();
      } else {
        return undefined;
      }
    },
    indexToWorkdir: function indexToWorkdir() {
      if (data.entry) {
        return entry.indexToWorkdir();
      } else {
        return undefined;
      }
    },
    path: function path() {
      return data.path;
    },
    isNew: function isNew() {
      return status & codes.WT_NEW || status & codes.INDEX_NEW;
    },
    isModified: function isModified() {
      return status & codes.WT_MODIFIED || status & codes.INDEX_MODIFIED;
    },
    isDeleted: function isDeleted() {
      return status & codes.WT_DELETED || status & codes.INDEX_DELETED;
    },
    isTypechange: function isTypechange() {
      return status & codes.WT_TYPECHANGE || status & codes.INDEX_TYPECHANGE;
    },
    isRenamed: function isRenamed() {
      return status & codes.WT_RENAMED || status & codes.INDEX_RENAMED;
    },
    isIgnored: function isIgnored() {
      return status & codes.IGNORED;
    },
    isConflicted: function isConflicted() {
      return status & codes.CONFLICTED;
    },
    inWorkingTree: function inWorkingTree() {
      return status & codes.WT_NEW || status & codes.WT_MODIFIED || status & codes.WT_DELETED || status & codes.WT_TYPECHANGE || status & codes.WT_RENAMED;
    },
    inIndex: function inIndex() {
      return status & codes.INDEX_NEW || status & codes.INDEX_MODIFIED || status & codes.INDEX_DELETED || status & codes.INDEX_TYPECHANGE || status & codes.INDEX_RENAMED;
    }
  };
};

NodeGit.StatusFile = StatusFile;