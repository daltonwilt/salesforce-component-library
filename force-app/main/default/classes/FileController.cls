/**********************************************************************************
* Name         : FileController
* Author       : Dalton Wilt
* Desc         : Shared Apex helpers for LWCs across programs - file attachment with
*                prefix categories, the running user's profile name, and a random-token
*                invocable for flows.
* Created On   : 2026-02-18
* Test classes : FileControllerTest
*
* Sharing      : inherited sharing - file save/list methods run in the caller's sharing
*                context, while invocable callers (flow) keep whatever context their
*                caller declared.
*
* Modification Log:
* ----------------------------------------------------------------------
* Developer        Date          Description
* ----------------------------------------------------------------------
* Dalton Wilt      2026-02-18    Initial implementation.
**********************************************************************************/

public inherited sharing class FileController {
  // Shepherd rendition endpoint for a ContentVersion preview image. Appended with a version Id.
  private static final String THUMB_PATH = '/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB240BY180&versionId=';

  // ------------------------------------------------------------------
  // Inner Classes
  // ------------------------------------------------------------------

  /**
   * One selectable file prefix, projected from Prefix_Option__mdt for a combobox. `value` is the
   * prefix actually stamped on the file; `developerName` is what callers pass back in to filter by
   * this single option.
   */
  public class PrefixOption {
    /** MasterLabel, for the combobox. */
    @AuraEnabled
    public String label;

    /** The prefix actually stamped on Prefix__c when a file is saved. */
    @AuraEnabled
    public String value;

    /** What callers pass back as `prefixOption` to filter by this one option. */
    @AuraEnabled
    public String developerName;

    /** 'Internal' or 'External', so a portal component can hide internal-only options. */
    @AuraEnabled
    public String visibility;

    /** Whether the upload section should insist on a file under this prefix. */
    @AuraEnabled
    public Boolean required;
  }

  /**
   * One row of the file list: the latest version of a file linked to the record, with the prefix it
   * was stamped with and a ready-to-use thumbnail URL.
   */
  public class FileRow {
    /** What deleteFile expects back - deletion works on the document, not the version. */
    @AuraEnabled
    public String contentDocumentId;

    /** The latest version, for preview and download links. */
    @AuraEnabled
    public String contentVersionId;

    /** File name as uploaded. */
    @AuraEnabled
    public String title;

    /** ContentVersion.FileType - Salesforce's own type name, e.g. PDF or EXCEL_X. */
    @AuraEnabled
    public String fileType;

    /** ContentVersion.FileExtension, for choosing an icon. */
    @AuraEnabled
    public String fileExtension;

    /** The Prefix__c this file was stamped with, or null when it was not. */
    @AuraEnabled
    public String filePrefix;

    /** When the latest version was published, newest first in getFiles. */
    @AuraEnabled
    public DateTime createdDate;

    /** ContentVersion.ContentSize in bytes. Drives size filters and download batching. */
    @AuraEnabled
    public Long contentSize;

    /** Shepherd rendition URL for a preview image; blank for types with no rendition. */
    @AuraEnabled
    public String thumbnailUrl;
  }

  /**
   * One FileRow from a ContentVersion. The query must project every field read here.
   *
   * On the outer class rather than on FileRow itself because an Apex inner class cannot
   * declare a static method. Shared rather than repeated so a caller listing files a
   * different way - by criteria rather than by parent record - produces rows the same
   * components can render.
   *
   * @param cv a ContentVersion carrying Id, ContentDocumentId, Title, FileType,
   *           FileExtension, ContentSize and CreatedDate. Prefix__c is optional -
   *           see below.
   * @return   the row; never null
   */
  public static FileRow toFileRow(ContentVersion cv) {
    FileRow row = new FileRow();
    row.contentDocumentId = (String) cv.ContentDocumentId;
    row.contentVersionId = (String) cv.Id;
    row.title = cv.Title;
    row.fileType = cv.FileType;
    row.fileExtension = cv.FileExtension;
    row.filePrefix = (String) cv.getPopulatedFieldsAsMap().get('Prefix__c');
    row.contentSize = cv.ContentSize;
    row.createdDate = cv.CreatedDate;
    // Root-relative, so the same URL resolves in the internal app and inside a community.
    row.thumbnailUrl = THUMB_PATH + cv.Id;
    return row;
  }

  // ------------------------------------------------------------------
  // Invocable
  // ------------------------------------------------------------------

  /**
   * Random 36-character tokens for Flow — one per input element, null or empty yields one.
   *
   * The input values themselves are ignored; only the size of the list matters, so a flow that just
   * needs a token can pass a single placeholder. Each token is the first 36 characters of a hex-
   * encoded AES-256 key, so it is cryptographically random rather than a formatted UUID.
   *
   * @param inputs one element per token wanted; the values are ignored, and null or
   *               empty yields a single token
   * @return       one 36-character token per input, in the same order
   */
  @InvocableMethod(
    label='Generate Random Token'
    description='Generates a random 36-character token'
  )
  public static List<String> generateRandomToken(List<String> inputs) {
    List<String> tokens = new List<String>();
    Integer size = inputs == null || inputs.isEmpty() ? 1 : inputs.size();
    for (Integer i = 0; i < size; i++) {
      String hex = EncodingUtil.convertToHex(Crypto.generateAesKey(256));
      tokens.add(hex.substring(0, 36));
    }
    return tokens;
  }

  // ------------------------------------------------------------------
  // Running user
  // ------------------------------------------------------------------

  /**
   * Profile name of the running user, for components that render or navigate differently for
   * portal vs internal users.
   *
   * cacheable so it can be wired: a profile cannot change mid-session, so every component on the
   * page shares one call. Returns null rather than throwing when the profile cannot be read —
   * callers already handle "not loaded yet".
   *
   * @return the running user's profile name, or null when it cannot be read
   */
  @AuraEnabled(cacheable=true)
  public static String getCurrentUserProfileName() {
    List<Profile> profiles = [
      SELECT Name
      FROM Profile
      WHERE Id = :UserInfo.getProfileId()
      LIMIT 1
    ];
    return profiles.isEmpty() ? null : profiles[0].Name;
  }

  // ------------------------------------------------------------------
  // File Prefix metadata lookups
  // ------------------------------------------------------------------

  /**
   * Options under a Prefix_Group__mdt (by DeveloperName), ordered by Sort_Order__c then label.
   *
   * @param prefixGroup the group's DeveloperName; blank returns an empty list
   * @return            the group's options in display order; empty, never null, when the
   *                    group is blank or matches nothing
   */
  @AuraEnabled(cacheable=true)
  public static List<PrefixOption> getPrefixOptions(String prefixGroup) {
    List<PrefixOption> options = new List<PrefixOption>();
    if (String.isBlank(prefixGroup)) {
      return options;
    }

    for (Prefix_Option__mdt opt : optionsByGroup(prefixGroup)) {
      PrefixOption po = new PrefixOption();
      po.label = opt.Label;
      po.value = opt.Prefix_Value__c;
      po.developerName = opt.DeveloperName;
      po.visibility = opt.Visibility__c;
      po.required = opt.Required__c;
      options.add(po);
    }
    return options;
  }

  /**
   * Prefix group belongs to, so a shared component can branch on groups
   * without hard-coding the mapping.
   *
   * @param prefixGroup the group's DeveloperName
   * @return            the Program__c value, or null when the group is blank or unknown
   */
  @AuraEnabled(cacheable=true)
  public static String getPrefixGroupProgram(String prefixGroup) {
    if (String.isBlank(prefixGroup)) {
      return null;
    }
    List<Prefix_Group__mdt> groups = [
      SELECT Program__c
      FROM Prefix_Group__mdt
      WHERE DeveloperName = :prefixGroup
      LIMIT 1
    ];
    return groups.isEmpty() ? null : groups[0].Program__c;
  }

  // ------------------------------------------------------------------
  // File CRUD
  // ------------------------------------------------------------------

  /**
   * Saves an uploaded file against a record, stamping the prefix that getFiles later filters on.
   * `parentId` optionally shares it with a second record — see linkToParent.
   *
   * base64Data is URL-decoded before it is base64-decoded: the browser sends the payload
   * URI-encoded, and skipping that step corrupts every file whose base64 contains '+' or '%'.
   *
   * @param recordId   the record to publish the file to; required
   * @param fileName   the file's name, used as both Title and PathOnClient; required
   * @param base64Data the file body, URI-encoded base64 as the browser sends it; required
   * @param prefix     the Prefix__c to stamp, so getFiles can filter on it; optional
   * @param parentId   a second record to share the file with; optional
   * @return           the new ContentVersion Id
   * @throws AuraHandledException when recordId, fileName or base64Data is missing
   */
  @AuraEnabled
  public static Id saveFile(
    Id recordId,
    String fileName,
    String base64Data,
    String prefix,
    Id parentId
  ) {
    if (
      recordId == null ||
      String.isBlank(fileName) ||
      String.isBlank(base64Data)
    ) {
      throw new AuraHandledException(
        'Record Id, file name, and file content are required.'
      );
    }

    String decoded = EncodingUtil.urlDecode(base64Data, 'UTF-8');

    ContentVersion cv = new ContentVersion();
    cv.Title = fileName;
    cv.PathOnClient = '/' + fileName;
    cv.FirstPublishLocationId = recordId;
    cv.VersionData = EncodingUtil.base64Decode(decoded);
    cv.IsMajorVersion = true;

    if (String.isNotBlank(prefix)) {
      cv.Prefix__c = prefix;
    }

    insert cv;

    if (parentId != null) {
      linkToParent(cv.Id, parentId);
    }

    return cv.Id;
  }

  /**
   * Deletes the whole ContentDocument — every version of it.
   *
   * Throws when the file is already gone rather than passing silently: two users deleting the same
   * row is the expected cause, and the second one should be told.
   *
   * @param contentDocumentId the document to delete, not one of its versions
   * @return                  'Success' - the callers are LWCs that only check for a throw
   * @throws AuraHandledException when the Id is null, or the file no longer exists
   */
  @AuraEnabled
  public static String deleteFile(Id contentDocumentId) {
    if (contentDocumentId == null) {
      throw new AuraHandledException('Content Document Id is required.');
    }
    List<ContentDocument> docs = [
      SELECT Id
      FROM ContentDocument
      WHERE Id = :contentDocumentId
      LIMIT 1
    ];
    if (docs.isEmpty()) {
      throw new AuraHandledException('File not found or already deleted.');
    }
    delete docs;
    return 'Success';
  }

  /**
   * Files linked to a record, newest first.
   *
   * Prefix filtering is opt-in. Pass a group (or a single option) and only files stamped with a
   * matching Prefix__c come back — that is what keeps a prefix-scoped upload section from
   * showing another section's files. Pass neither and every file on the record is returned.
   *
   * A group or option that resolves to no prefix values still returns nothing: the caller asked for
   * a category that does not exist, and answering with unrelated files would be worse than empty.
   *
   * @param recordId     the record whose files to list; null returns an empty list
   * @param prefixGroup  restrict to files stamped with any option in this group; optional
   * @param prefixOption restrict to this single option's prefix; optional, and narrower
   *                     than prefixGroup when both are supplied
   * @return             the record's files, newest first; empty, never null
   */
  @AuraEnabled(cacheable=true)
  public static List<FileRow> getFiles(
    Id recordId,
    String prefixGroup,
    String prefixOption
  ) {
    List<FileRow> rows = new List<FileRow>();
    if (recordId == null) {
      return rows;
    }

    Boolean filterByPrefix =
      String.isNotBlank(prefixGroup) || String.isNotBlank(prefixOption);
    Set<String> prefixValues = filterByPrefix
      ? resolvePrefixValues(prefixGroup, prefixOption)
      : new Set<String>();
    if (filterByPrefix && prefixValues.isEmpty()) {
      return rows;
    }

    Set<Id> documentIds = new Set<Id>();
    for (ContentDocumentLink link : [
      SELECT ContentDocumentId
      FROM ContentDocumentLink
      WHERE LinkedEntityId = :recordId
    ]) {
      documentIds.add(link.ContentDocumentId);
    }
    if (documentIds.isEmpty()) {
      return rows;
    }

    // Two queries rather than one with an always-true clause: Prefix__c IN :emptySet would
    // match nothing, and a file saved without a prefix has to be listed in the unfiltered case.
    List<ContentVersion> versions = filterByPrefix
      ? [
          SELECT
            Id,
            ContentDocumentId,
            Title,
            FileType,
            FileExtension,
            Prefix__c,
            ContentSize,
            CreatedDate
          FROM ContentVersion
          WHERE
            ContentDocumentId IN :documentIds
            AND IsLatest = TRUE
            AND Prefix__c IN :prefixValues
          ORDER BY CreatedDate DESC
        ]
      : [
          SELECT
            Id,
            ContentDocumentId,
            Title,
            FileType,
            FileExtension,
            Prefix__c,
            ContentSize,
            CreatedDate
          FROM ContentVersion
          WHERE ContentDocumentId IN :documentIds AND IsLatest = TRUE
          ORDER BY CreatedDate DESC
        ];

    for (ContentVersion cv : versions) {
      rows.add(toFileRow(cv));
    }
    return rows;
  }

  // ------------------------------------------------------------------
  // Support Methods
  // ------------------------------------------------------------------

  /**
   * The Prefix__c values a file list should be filtered to. A specific option wins over its
   * group; given only a group, every option under it counts. Empty means "show nothing".
   */
  private static Set<String> resolvePrefixValues(
    String prefixGroup,
    String prefixOption
  ) {
    Set<String> values = new Set<String>();

    if (String.isNotBlank(prefixOption)) {
      for (Prefix_Option__mdt opt : optionByName(prefixOption, prefixGroup)) {
        if (String.isNotBlank(opt.Prefix_Value__c)) {
          values.add(opt.Prefix_Value__c);
        }
      }
      return values;
    }

    if (String.isNotBlank(prefixGroup)) {
      for (Prefix_Option__mdt opt : optionsByGroup(prefixGroup)) {
        if (String.isNotBlank(opt.Prefix_Value__c)) {
          values.add(opt.Prefix_Value__c);
        }
      }
    }
    return values;
  }

  // ------------------------------------------------------------------
  // Prefix_Option__mdt reads
  // ------------------------------------------------------------------

  @TestVisible
  private static List<Prefix_Option__mdt> mockOptions;

  /** Every option under a group, ordered by Sort_Order__c then label. */
  private static List<Prefix_Option__mdt> optionsByGroup(String prefixGroup) {
    if (mockOptions != null) {
      return mockOptions;
    }
    return [
      SELECT
        DeveloperName,
        Label,
        Prefix_Value__c,
        Sort_Order__c,
        Visibility__c,
        Required__c
      FROM Prefix_Option__mdt
      WHERE Prefix_Group__r.DeveloperName = :prefixGroup
      ORDER BY Sort_Order__c ASC NULLS LAST, Label ASC
    ];
  }

  /**
   * A single option by DeveloperName, constrained to its group when one was named.
   *
   * The lookup is split into two queries instead of one with an optional group clause because SOQL
   * cannot compare a relationship field to a bound null — `Prefix_Group__r.DeveloperName =
   * :prefixGroup` with a null bind is invalid, not a match-anything.
   */
  private static List<Prefix_Option__mdt> optionByName(
    String prefixOption,
    String prefixGroup
  ) {
    if (mockOptions != null) {
      for (Prefix_Option__mdt opt : mockOptions) {
        if (opt.DeveloperName == prefixOption) {
          return new List<Prefix_Option__mdt>{ opt };
        }
      }
      return new List<Prefix_Option__mdt>();
    }
    if (String.isNotBlank(prefixGroup)) {
      return [
        SELECT Prefix_Value__c
        FROM Prefix_Option__mdt
        WHERE
          DeveloperName = :prefixOption
          AND Prefix_Group__r.DeveloperName = :prefixGroup
        LIMIT 1
      ];
    }
    return [
      SELECT Prefix_Value__c
      FROM Prefix_Option__mdt
      WHERE DeveloperName = :prefixOption
      LIMIT 1
    ];
  }

  /**
   * Shares an already-inserted file with a second record, so a file uploaded against a child is
   * also reachable from its parent.
   *
   * ShareType 'V' (viewer) rather than 'I': the link is a second window onto the file, and inferred
   * access would hand the parent's editors rights the upload location never granted.
   */
  private static void linkToParent(Id contentVersionId, Id parentId) {
    Id contentDocumentId = [
      SELECT ContentDocumentId
      FROM ContentVersion
      WHERE Id = :contentVersionId
      LIMIT 1
    ]
    .ContentDocumentId;

    insert new ContentDocumentLink(
      ContentDocumentId = contentDocumentId,
      LinkedEntityId = parentId,
      ShareType = 'V'
    );
  }
}