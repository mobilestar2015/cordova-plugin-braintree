'use strict';

const xcode = require('xcode'),
    fs = require('fs'),
    path = require('path'),
    plist = require('plist');

module.exports = function(context) {
    if(process.length >=5 && process.argv[1].indexOf('cordova') == -1) {
        if(process.argv[4] != 'ios') {
            return; // plugin only meant to work for ios platform.
        }
    }

    function fromDir(startPath,filter, rec, multiple){
        if (!fs.existsSync(startPath)){
            console.log("no dir ", startPath);
            return;
        }

        const files=fs.readdirSync(startPath);
        var resultFiles = []
        for(var i=0;i<files.length;i++){
            var filename=path.join(startPath,files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory() && rec){
                fromDir(filename,filter); //recurse
            }

            if (filename.indexOf(filter)>=0) {
                if (multiple) {
                    resultFiles.push(filename);
                } else {
                    return filename;
                }
            }
        }
        if(multiple) {
            return resultFiles;
        }
    }

    const xcodeProjPath = fromDir('platforms/ios','.xcodeproj', false);
    const projectPath = xcodeProjPath + '/project.pbxproj';
    if (!fs.existsSync(projectPath)) {
        console.log('XCode poject not found ' + projectPath);
        return;
    }
    const myProj = xcode.project(projectPath);

    myProj.parseSync();

    // unquote (remove trailing ")
    var projectName = myProj.getFirstTarget().firstTarget.name;
    if (projectName.charAt(0)=="\"") {
      projectName = projectName.substr(1);
      projectName = projectName.substr(0, projectName.length-1); //Removing the char " at beginning and the end.
    }

	/* add ${PRODUCT_BUNDLE_IDENTIFIER}.payments to URL Schemes */
	process.chdir('./platforms/ios/' + projectName);
	var infoPlist = plist.parse(fs.readFileSync(projectName + '-Info.plist', 'utf8'));

	var found = false;
	if (infoPlist.CFBundleURLTypes) {
		infoPlist.CFBundleURLTypes.forEach(function(curValue,index) {
			if (curValue.CFBundleURLSchemes) {
				curValue.CFBundleURLSchemes.forEach(function(curValue2,index2) {
					if (curValue2 == "${PRODUCT_BUNDLE_IDENTIFIER}.payments") {
						found = true;
					}
				});
			}
		});
	} else {
		infoPlist.CFBundleURLTypes = new Array();
	}
	if (!found) {
		infoPlist.CFBundleURLTypes.push( {"CFBundleTypeRole":"Editor","CFBundleURLSchemes":["${PRODUCT_BUNDLE_IDENTIFIER}.payments"]} );
		fs.writeFileSync(projectName + '-Info.plist', plist.build(infoPlist), { encoding : 'utf8'});
	}
	process.chdir('../../../');
};