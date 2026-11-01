/**********************************************************************************
* Name         : FileControllerTest
* Author       : Dalton Wilt
* Desc         : Tests for FileController.
*
*                Prefix_Option__mdt cannot be inserted in test context, so the
*                prefix-matched paths run against options assigned to
*                FileController.mockOptions. The unknown-developer-name tests leave it null
*                so the real queries still execute.
* Created On   : 2026-05-11
*
* Class under test : FileController
*
* Modification Log:
* ----------------------------------------------------------------------
* Developer        Date          Description
* ----------------------------------------------------------------------
* Dalton Wilt      2026-05-11    Initial implementation.
**********************************************************************************/

@isTest
public class FileControllerTest {
  private static final String BASE64 = EncodingUtil.base64Encode(
    Blob.valueOf('file body')
  );

  private static Prefix_Option__mdt option(
    String developerName,
    String prefixValue
  ) {
    return new Prefix_Option__mdt(
      DeveloperName = developerName,
      MasterLabel = developerName,
      Prefix_Value__c = prefixValue,
      Sort_Order__c = 1,
      Visibility__c = 'Internal',
      Required__c = true
    );
  }

  private static Set<String> titlesOf(List<FileController.FileRow> rows) {
    Set<String> titles = new Set<String>();
    for (FileController.FileRow row : rows) {
      titles.add(row.title);
    }
    return titles;
  }

  // ---------------- generateRandomToken ----------------

  @isTest
  static void generateRandomToken_returnsOneTokenPerInput() {
    List<String> three = FileController.generateRandomToken(
      new List<String>{ 'a', 'b', 'c' }
    );

    System.assertEquals(3, three.size());
    for (String t : three) {
      System.assertEquals(36, t.length());
    }
    System.assertEquals(
      1,
      FileController.generateRandomToken(new List<String>()).size(),
      'an empty list still yields one token'
    );
    System.assertEquals(
      1,
      FileController.generateRandomToken(null).size(),
      'so does a null list'
    );
  }

  // ---------------- Running user ----------------

  @isTest
  static void getCurrentUserProfileName_returnsRunningUsersProfile() {
    String expected = [
      SELECT Name
      FROM Profile
      WHERE Id = :UserInfo.getProfileId()
      LIMIT 1
    ]
    .Name;

    System.assertEquals(
      expected,
      FileController.getCurrentUserProfileName(),
      'Should return the running user\'s profile name.'
    );
  }

  // ---------------- Prefix metadata lookups ----------------

  @isTest
  static void prefixMetadataLookups_unknownOrBlank_resolveToNothing() {
    System.assertEquals(
      0,
      FileController.getPrefixOptions(null).size(),
      'a blank group short-circuits before the query'
    );
    System.assertEquals(
      0,
      FileController.getPrefixOptions('Group_That_Does_Not_Exist_XYZ').size(),
      'a group with no options resolves to nothing'
    );
    System.assertEquals(null, FileController.getPrefixGroupProgram(''));
    System.assertEquals(
      null,
      FileController.getPrefixGroupProgram('Group_That_Does_Not_Exist_XYZ')
    );
  }

  @isTest
  static void getPrefixOptions_projectsEveryOptionField() {
    FileController.mockOptions = new List<Prefix_Option__mdt>{
      option('Opt_A', 'PREFIX-A'),
      option('Opt_B', 'PREFIX-B')
    };

    List<FileController.PrefixOption> result = FileController.getPrefixOptions(
      'AnyGroup'
    );

    System.assertEquals(2, result.size());
    System.assertEquals('PREFIX-A', result[0].value);
    System.assertEquals('Opt_A', result[0].developerName);
    System.assertEquals('Internal', result[0].visibility);
    System.assertEquals(true, result[0].required);
    System.assertEquals('PREFIX-B', result[1].value);
  }

  // ---------------- saveFile ----------------

  @isTest
  static void saveFile_stampsPrefixAndLinksToParent() {
    Account owner = new Account(Name = 'Utility Loader Owner');
    Account parent = new Account(Name = 'Utility Loader Parent');
    insert new List<Account>{ owner, parent };

    // The browser sends the payload URI-encoded; saveFile URL-decodes before base64-decoding.
    String encoded = EncodingUtil.urlEncode('VGVzdCBTdHJpbmc=', 'UTF-8');

    Id prefixed = FileController.saveFile(
      owner.Id,
      'linked.txt',
      encoded,
      'PREFIX-Report',
      parent.Id
    );
    Id bare = FileController.saveFile(owner.Id, 'bare.txt', encoded, null, null);

    Set<Id> savedIds = new Set<Id>{ prefixed, bare };
    Map<Id, ContentVersion> saved = new Map<Id, ContentVersion>(
      [
        SELECT
          Id,
          Title,
          Prefix__c,
          FirstPublishLocationId,
          ContentDocumentId
        FROM ContentVersion
        WHERE Id IN :savedIds
      ]
    );
    System.assertEquals('linked.txt', saved.get(prefixed).Title);
    System.assertEquals(
      'PREFIX-Report',
      saved.get(prefixed).Prefix__c
    );
    System.assertEquals(owner.Id, saved.get(prefixed).FirstPublishLocationId);
    System.assertEquals(
      null,
      saved.get(bare).Prefix__c,
      'a blank prefix leaves Prefix__c null'
    );
    System.assertEquals(
      1,
      [
        SELECT COUNT()
        FROM ContentDocumentLink
        WHERE
          ContentDocumentId = :saved.get(prefixed).ContentDocumentId
          AND LinkedEntityId = :parent.Id
      ],
      'parentId shares the file with a second record'
    );
  }

  @isTest
  static void saveFile_missingInputs_throws() {
    Boolean threw = false;
    try {
      FileController.saveFile(null, 'x.txt', 'abc', 'P', null);
    } catch (AuraHandledException e) {
      threw = true;
    }
    System.assert(threw, 'Should throw when recordId is null.');
  }

  // ---------------- deleteFile ----------------

  // Deleting an already-deleted file throws rather than passing silently: two users deleting the
  // same row is the expected cause, and the second one should be told.
  @isTest
  static void deleteFile_removesDocumentThenRefusesTheSecondCall() {
    Account a = new Account(Name = 'Utility Delete Test');
    insert a;
    Id versionId = FileController.saveFile(a.Id, 'toDelete.txt', BASE64, null, null);
    Id documentId = [
      SELECT ContentDocumentId
      FROM ContentVersion
      WHERE Id = :versionId
    ]
    .ContentDocumentId;

    System.assertEquals('Success', FileController.deleteFile(documentId));
    System.assertEquals(
      0,
      [SELECT COUNT() FROM ContentDocument WHERE Id = :documentId]
    );

    Set<String> threw = new Set<String>();
    try {
      FileController.deleteFile(null);
    } catch (AuraHandledException e) {
      threw.add('null');
    }
    try {
      FileController.deleteFile(documentId);
    } catch (AuraHandledException e) {
      threw.add('alreadyDeleted');
    }
    System.assertEquals(new Set<String>{ 'null', 'alreadyDeleted' }, threw);
  }

  // ---------------- getFiles ----------------

  @isTest
  static void getFiles_noRecordOrNoFiles_returnsEmpty() {
    Account a = new Account(Name = 'Utility Preview Empty');
    insert a;

    System.assertEquals(0, FileController.getFiles(null, 'AnyGroup', null).size());
    System.assertEquals(
      0,
      FileController.getFiles(a.Id, null, null).size(),
      'a record with no files is empty rather than an error'
    );
  }

  // A group or option that resolves to no prefix values returns nothing: the caller asked for a
  // category that does not exist, and answering with unrelated files would be worse than empty.
  @isTest
  static void getFiles_unknownPrefixes_returnEmpty() {
    Account a = new Account(Name = 'Utility Preview Unknown');
    insert a;
    FileController.saveFile(a.Id, 'a.txt', BASE64, 'PREFIX-A', null);

    System.assertEquals(
      0,
      FileController.getFiles(a.Id, 'GroupDoesNotExist_XYZ', null).size(),
      'unknown group'
    );
    System.assertEquals(
      0,
      FileController.getFiles(a.Id, null, 'OptionDoesNotExist_XYZ').size(),
      'unknown option, no group'
    );
    List<FileController.FileRow> unknownBoth = FileController.getFiles(
      a.Id,
      'GroupDoesNotExist_XYZ',
      'OptionDoesNotExist_XYZ'
    );
    System.assertEquals(
      0,
      unknownBoth.size(),
      'unknown option constrained to a group'
    );
  }

  @isTest
  static void getFiles_noPrefixRequested_returnsEveryFileOnTheRecord() {
    Account a = new Account(Name = 'Utility Preview All');
    insert a;
    FileController.saveFile(a.Id, 'prefixed.txt', BASE64, 'PREFIX', null);
    FileController.saveFile(a.Id, 'bare.txt', BASE64, null, null);

    System.assertEquals(
      new Set<String>{ 'prefixed.txt', 'bare.txt' },
      titlesOf(FileController.getFiles(a.Id, null, null)),
      'a file saved with no prefix is still the record\'s file'
    );
  }

  @isTest
  static void getFiles_prefixFilters_scopeToTheRequestedCategory() {
    Account a = new Account(Name = 'Utility Preview Filters');
    insert a;
    FileController.saveFile(a.Id, 'a.txt', BASE64, 'PREFIX-A', null);
    FileController.saveFile(a.Id, 'b.txt', BASE64, 'PREFIX-B', null);
    FileController.saveFile(a.Id, 'other.txt', BASE64, 'PREFIX-UNRELATED', null);

    FileController.mockOptions = new List<Prefix_Option__mdt>{
      option('Opt_A', 'PREFIX-A'),
      option('Opt_B', 'PREFIX-B'),
      option('Opt_Blank', null)
    };

    List<FileController.FileRow> byOption = FileController.getFiles(
      a.Id,
      'AnyGroup',
      'Opt_A'
    );

    System.assertEquals(
      1,
      byOption.size(),
      'Only the file stamped with the requested option should be listed.'
    );
    System.assertEquals('a.txt', byOption[0].title);
    System.assertEquals('PREFIX-A', byOption[0].filePrefix);
    System.assert(
      byOption[0].thumbnailUrl.endsWith(byOption[0].contentVersionId),
      'Thumbnail URL should target the returned version.'
    );
    System.assertEquals(
      new Set<String>{ 'b.txt' },
      titlesOf(FileController.getFiles(a.Id, null, 'Opt_B')),
      'an option resolves without a group too'
    );
    System.assertEquals(
      new Set<String>{ 'a.txt', 'b.txt' },
      titlesOf(FileController.getFiles(a.Id, 'AnyGroup', null)),
      'A group filter should match every option under it and nothing else.'
    );
    System.assertEquals(
      0,
      FileController.getFiles(a.Id, 'AnyGroup', 'Opt_Not_In_Group').size(),
      'an option that is not under the group resolves to nothing'
    );
    System.assertEquals(
      0,
      FileController.getFiles(a.Id, 'AnyGroup', 'Opt_Blank').size(),
      'An option with no prefix value resolves to nothing rather than every file.'
    );
  }
}