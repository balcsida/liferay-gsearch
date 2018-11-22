
package fi.soveltia.liferay.gsearch.core.impl.results.item;

import com.liferay.asset.kernel.model.AssetCategory;
import com.liferay.asset.kernel.model.AssetRenderer;
import com.liferay.asset.kernel.service.AssetCategoryLocalService;
import com.liferay.asset.publisher.web.constants.AssetPublisherPortletKeys;
import com.liferay.journal.model.JournalArticle;
import com.liferay.journal.service.JournalArticleService;
import com.liferay.portal.kernel.exception.PortalException;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.model.Layout;
import com.liferay.portal.kernel.portlet.LiferayPortletRequest;
import com.liferay.portal.kernel.portlet.LiferayPortletResponse;
import com.liferay.portal.kernel.search.Document;
import com.liferay.portal.kernel.search.Field;
import com.liferay.portal.kernel.search.Indexer;
import com.liferay.portal.kernel.search.SearchException;
import com.liferay.portal.kernel.service.GroupLocalService;
import com.liferay.portal.kernel.service.LayoutLocalServiceUtil;
import com.liferay.portal.kernel.theme.ThemeDisplay;
import com.liferay.portal.kernel.util.HtmlUtil;
import com.liferay.portal.kernel.util.PortalUtil;
import com.liferay.portal.kernel.util.StringBundler;
import com.liferay.portal.kernel.util.StringPool;
import com.liferay.portal.kernel.util.Validator;

import com.liferay.portal.kernel.util.WebKeys;
import fi.soveltia.liferay.gsearch.core.impl.util.GSearchUtil;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import fi.soveltia.liferay.gsearch.core.api.constants.GSearchWebKeys;
import fi.soveltia.liferay.gsearch.core.api.results.item.ResultItemBuilder;

import javax.portlet.PortletRequest;
import javax.portlet.PortletResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * JournalArticle item type result builder.
 *
 * @author Petteri Karttunen
 */
@Component(
	immediate = true,
	service = ResultItemBuilder.class
)
public class JournalArticleItemBuilder extends BaseResultItemBuilder
	implements ResultItemBuilder {

	private static final String FLAMMA_GROUP_FRIENDLY_URL = "/flamma";

	@Override
	public boolean canBuild(Document document) {

		return false; // replaced with ddm structure specific journal article builders
	}


	/**
	 * {@inheritDoc}
	 *
	 * @throws Exception
	 */
	@Override
	public String getImageSrc(PortletRequest portletRequest, long entryClassPK)
		throws Exception {

		ThemeDisplay themeDisplay = (ThemeDisplay) portletRequest.getAttribute(
			GSearchWebKeys.THEME_DISPLAY);

		return getJournalArticle(entryClassPK).getArticleImageURL(themeDisplay);
	}

	/**
	 * {@inheritDoc}
	 */
	@Override
	public String getLink(PortletRequest portletRequest, PortletResponse portletResponse, Document document, String assetPublisherPageFriendlyURL, long entryClassPK)
		throws Exception {

		String link = null;

		AssetRenderer<?> assetRenderer = getAssetRenderer(JournalArticle.class.getName(), entryClassPK);
		link = assetRenderer.getURLViewInContext(
			(LiferayPortletRequest) portletRequest,
			(LiferayPortletResponse) portletResponse, null);

		if (Validator.isNull(link)) {
			link = getNotLayoutBoundJournalArticleUrl(portletRequest, getJournalArticle(entryClassPK), assetPublisherPageFriendlyURL);
		}

		return link;
	}

	/**
	 * Get a view url for an article which is not bound to a layout or has a
	 * default view page.
	 *
	 * @return url string
	 * @throws PortalException
	 */
	private String getNotLayoutBoundJournalArticleUrl(PortletRequest portletRequest,
		JournalArticle journalArticle, String assetPublisherPageFriendlyURL) throws PortalException {

		ThemeDisplay themeDisplay =
			(ThemeDisplay) portletRequest.getAttribute(WebKeys.THEME_DISPLAY);

		Layout layout = getLayoutByFriendlyURL(
			portletRequest, assetPublisherPageFriendlyURL);

		String assetPublisherInstanceId =
			GSearchUtil.findDefaultAssetPublisherInstanceId(layout);

		StringBundler sb = new StringBundler();
		sb.append(PortalUtil.getLayoutFriendlyURL(layout, themeDisplay));
		sb.append("/-/asset_publisher/");
		sb.append(assetPublisherInstanceId);
		sb.append("/content/");
		sb.append(journalArticle.getUrlTitle());
		sb.append("?_");
		sb.append(AssetPublisherPortletKeys.ASSET_PUBLISHER);
		sb.append("_INSTANCE_");
		sb.append(assetPublisherInstanceId);
		sb.append("_groupId=");
		sb.append(journalArticle.getGroupId());

		return sb.toString();
	}

	/**
	 * {@inheritDoc}
	 */
	@Override
	public String getBreadcrumbs(PortletRequest portletRequest, PortletResponse portletResponse, Document document, String assetPublisherPageFriendlyURL, long entryClassPK) throws Exception {

		long groupId = getJournalArticle(entryClassPK).getGroupId();
		Locale locale = portletRequest.getLocale();

		final List<String> breadcrumbs = new ArrayList<>();

		Layout layout = getJournalArticleLayout(portletRequest, portletResponse, document, assetPublisherPageFriendlyURL, groupId, entryClassPK);
		if (layout != null) {
			breadcrumbs.add(layout.getName(locale));
			List<Layout> ancestors = layout.getAncestors();
			ancestors.forEach(a -> breadcrumbs.add(a.getName(locale)));
		}
		breadcrumbs.add(_resultItemCommonService.getGroupName(groupId, locale));

		Collections.reverse(breadcrumbs);

		return String.join(" / ", breadcrumbs);
	}

	private Layout getJournalArticleLayout(PortletRequest portletRequest, PortletResponse portletResponse, Document document, String assetPublisherPageFriendlyURL, long groupId, long entryClassPK) throws Exception {
		String link = getLink(portletRequest, portletResponse, document, assetPublisherPageFriendlyURL, entryClassPK);
		return _resultItemCommonService.getAssetLayout(groupId, link);

	}

	@Override
	public String[] getCategories(Document document, Locale locale) {
		String[] categoryIds = document.getValues(Field.ASSET_CATEGORY_IDS);

		List<String> categories = new ArrayList<>();

		if (categoryIds != null) {
			for (String id : categoryIds) {
				try {
					AssetCategory category = _assetCategoryLocalService.getCategory(Long.valueOf(id));
					categories.add(category.getTitle(locale));
				} catch (PortalException e) {
					log.error(String.format("Cannot get asset category for id %s", id));
				} catch (NumberFormatException e) {
					// do nothing
				}
			}

		}
		return categories.toArray(new String[] {});
	}

	@Override
	public String getTitle(PortletRequest portletRequest, PortletResponse portletResponse, Document document, Locale locale, long entryClassPK)
		throws NumberFormatException, PortalException {

		String title = getSummary(portletRequest, portletResponse, document).getTitle();

		if (Validator.isNull(title)) {
			title = getAssetRenderer(JournalArticle.class.getName(), entryClassPK).getTitle(locale);
		}
		return HtmlUtil.stripHtml(title);
	}

	@Override
	public String getDescription(PortletRequest portletRequest, PortletResponse portletResponse, Document document, Locale locale) throws SearchException {

		String languageId = locale.toString();

		Indexer<?> indexer =
			getIndexer(document.get(Field.ENTRY_CLASS_NAME));

		if (indexer != null) {
			String snippet = document.get(Field.SNIPPET + StringPool.UNDERLINE + Field.CONTENT + StringPool.UNDERLINE + languageId);

			if ((snippet != null) && !snippet.isEmpty()) {
				return HtmlUtil.stripHtml(snippet);
			}
		}
		return super.getDescription(portletRequest, portletResponse, document, locale);
	}

	/**
	 * Get journal article.
	 *
	 * @return
	 * @throws PortalException
	 */
	protected JournalArticle getJournalArticle(long entryClassPK)
		throws PortalException {

		return _journalArticleService.getLatestArticle(entryClassPK);
	}

	/**
	 * Get layout by friendlyurl.
	 *
	 * @return layout
	 * @throws PortalException
	 *             if layout is not found
	 */
	private Layout getLayoutByFriendlyURL(
		PortletRequest portletRequest, String layoutFriendlyURL)
		throws PortalException {

		ThemeDisplay themeDisplay = (ThemeDisplay) portletRequest.getAttribute(WebKeys.THEME_DISPLAY);

		if (layoutFriendlyURL != null) {
			Group flammaGroup = _groupLocalService.getFriendlyURLGroup(themeDisplay.getCompanyId(), FLAMMA_GROUP_FRIENDLY_URL);

			return LayoutLocalServiceUtil.getFriendlyURLLayout(
				flammaGroup.getGroupId(),
				true, layoutFriendlyURL);
		}

		throw new PortalException(
			"Couldn't find asset publisher layout for " + layoutFriendlyURL +
				". Please check configuration.");
	}

	@Reference(unbind = "-")
	protected void setJournalArticleService(
		JournalArticleService journalArticleService) {

		_journalArticleService = journalArticleService;
	}

	@Reference(unbind = "-")
	protected void setAssetCategoryLocalService(
		AssetCategoryLocalService assetCategoryLocalService) {

		_assetCategoryLocalService = assetCategoryLocalService;
	}

	@Reference(unbind = "-")
	protected void setGroupLocalService(
		GroupLocalService groupLocalService) {

		_groupLocalService = groupLocalService;
	}


	@Reference(unbind = "-")
	protected void setResultItemCommonService(
		ResultItemCommonService resultItemCommonService) {

		_resultItemCommonService = resultItemCommonService;
	}

	private static ResultItemCommonService _resultItemCommonService;

	private static JournalArticleService _journalArticleService;

	private static AssetCategoryLocalService _assetCategoryLocalService;

	private static GroupLocalService _groupLocalService;

	static final String NAME = JournalArticle.class.getName();

	private static final Log log = LogFactoryUtil.getLog(JournalArticleItemBuilder.class);

	@Override
	public String getType() {
		return null;
	}
}
